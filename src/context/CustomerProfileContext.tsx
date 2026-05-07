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

export type SavedAddress = {
  id: string;
  label: string;
  line1: string;
  instructions?: string;
};

export type CustomerProfile = {
  addresses: SavedAddress[];
  selectedAddressId: string | null;
};

const KEY = "customer.v1";

const initial: CustomerProfile = {
  addresses: [
    {
      id: "addr-home",
      label: "Home",
      line1: "12 Jalan Ampang, 50450 Kuala Lumpur",
    },
    {
      id: "addr-office",
      label: "Office",
      line1: "Menara KL, Jalan Punchak, 50250 Kuala Lumpur",
      instructions: "Reception desk on the ground floor",
    },
  ],
  selectedAddressId: "addr-home",
};

function read(): CustomerProfile {
  return { ...initial, ...loadJSON<CustomerProfile>(KEY, initial) };
}

type CustomerProfileContextValue = {
  profile: CustomerProfile;
  selectedAddress: SavedAddress | null;
  selectAddress: (id: string) => void;
  addAddress: (a: Omit<SavedAddress, "id">) => SavedAddress;
  removeAddress: (id: string) => void;
};

const CustomerProfileContext =
  createContext<CustomerProfileContextValue | null>(null);

export function CustomerProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CustomerProfile>(read);

  useEffect(() => {
    return subscribeToKey(KEY, () => setProfile(read()));
  }, []);

  const update = useCallback((next: CustomerProfile) => {
    saveJSON(KEY, next);
    setProfile(next);
  }, []);

  const selectAddress = useCallback(
    (id: string) => {
      update({ ...profile, selectedAddressId: id });
    },
    [profile, update],
  );

  const addAddress = useCallback<CustomerProfileContextValue["addAddress"]>(
    (a) => {
      const id = `addr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const created: SavedAddress = { ...a, id };
      update({
        addresses: [...profile.addresses, created],
        selectedAddressId: id,
      });
      return created;
    },
    [profile, update],
  );

  const removeAddress = useCallback(
    (id: string) => {
      const remaining = profile.addresses.filter((a) => a.id !== id);
      update({
        addresses: remaining,
        selectedAddressId:
          profile.selectedAddressId === id
            ? (remaining[0]?.id ?? null)
            : profile.selectedAddressId,
      });
    },
    [profile, update],
  );

  const selectedAddress =
    profile.addresses.find((a) => a.id === profile.selectedAddressId) ??
    profile.addresses[0] ??
    null;

  const value = useMemo(
    () => ({ profile, selectedAddress, selectAddress, addAddress, removeAddress }),
    [profile, selectedAddress, selectAddress, addAddress, removeAddress],
  );

  return (
    <CustomerProfileContext.Provider value={value}>
      {children}
    </CustomerProfileContext.Provider>
  );
}

export function useCustomerProfile() {
  const ctx = useContext(CustomerProfileContext);
  if (!ctx)
    throw new Error(
      "useCustomerProfile must be used inside CustomerProfileProvider",
    );
  return ctx;
}
