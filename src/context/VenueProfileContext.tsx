import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadJSON, saveJSON, subscribeToKey } from "../lib/sync";
import { useVenue } from "./VenueContext";
import type { Venue } from "../data/venues";

export type VenueProfile = {
  businessName: string;
  ssmNumber: string;
  /** Empty string when not registered for SST — receipt should hide SST line. */
  sstRegistrationNumber: string;
  address: string;
};

const KEY = "venue.v1";

function defaultsFromVenue(venue: Venue): VenueProfile {
  return {
    businessName: venue.name,
    ssmNumber: venue.ssm,
    sstRegistrationNumber: venue.sstRegistrationNumber ?? "",
    address: venue.address,
  };
}

type VenueProfileContextValue = {
  profile: VenueProfile;
  updateProfile: (partial: Partial<VenueProfile>) => void;
  resetToDefaults: () => void;
};

const VenueProfileContext = createContext<VenueProfileContextValue | null>(null);

export function VenueProfileProvider({ children }: { children: ReactNode }) {
  const venue = useVenue();
  const initial = useMemo(() => defaultsFromVenue(venue), [venue]);

  const read = useCallback(
    (): VenueProfile => ({ ...initial, ...loadJSON<VenueProfile>(KEY, initial) }),
    [initial],
  );

  const [profile, setProfile] = useState<VenueProfile>(read);

  useEffect(() => {
    return subscribeToKey(KEY, () => setProfile(read()));
  }, [read]);

  const updateProfile = useCallback((partial: Partial<VenueProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...partial };
      saveJSON(KEY, next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    saveJSON(KEY, initial);
    setProfile(initial);
  }, [initial]);

  const value = useMemo(
    () => ({ profile, updateProfile, resetToDefaults }),
    [profile, updateProfile, resetToDefaults],
  );

  return (
    <VenueProfileContext.Provider value={value}>
      {children}
    </VenueProfileContext.Provider>
  );
}

export function useVenueProfile() {
  const ctx = useContext(VenueProfileContext);
  if (!ctx)
    throw new Error(
      "useVenueProfile must be used inside VenueProfileProvider",
    );
  return ctx;
}
