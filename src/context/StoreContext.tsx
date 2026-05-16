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
import type { DayHours, Venue, WeekHours } from "../data/venues";

export type { DayHours, WeekHours };

export type StoreStatus = "open" | "busy" | "paused";

export type StoreState = {
  status: StoreStatus;
  busyExtraMinutes: number;
  pausedUntil: number | null;
  closingToday: boolean;
  /** Kitchen-controlled default prep time (minutes). Vendor edits in store sheet. */
  kitchenPrepMinutes: number;
  hours: WeekHours;
  /** Minimum cart subtotal required for delivery (RM). 0 = no minimum. */
  deliveryMinSubtotal: number;
  /**
   * Demo-only override: when true, the clock-based off-hours check is
   * bypassed so the customer flow runs anytime. Manual paused / closing-today
   * still take effect — those are deliberate vendor actions worth keeping
   * demoable. Toggled from the Demo controls drawer.
   */
  forceOpenForDemo: boolean;
};

const KEY = "store.v1";

function defaultsFromVenue(venue: Venue): StoreState {
  return {
    status: "open",
    busyExtraMinutes: 0,
    pausedUntil: null,
    closingToday: false,
    kitchenPrepMinutes: venue.kitchenPrepDefaultMinutes,
    hours: venue.hours,
    deliveryMinSubtotal: venue.deliveryMinSubtotal,
    forceOpenForDemo: false,
  };
}

type StoreContextValue = {
  state: StoreState;
  setOpen: () => void;
  setBusy: (extraMinutes: number) => void;
  setPaused: (durationMinutes: number | null) => void;
  setClosingToday: (v: boolean) => void;
  setKitchenPrepMinutes: (n: number) => void;
  setDayHours: (dayIdx: number, hours: DayHours) => void;
  setDeliveryMinSubtotal: (n: number) => void;
  setForceOpenForDemo: (v: boolean) => void;
  /** Convenience: store accepting new orders right now? */
  isAcceptingOrders: boolean;
  /** True iff outside the weekly schedule (regardless of manual status). */
  isOutsideHours: boolean;
  /** Human label for next opening when outside hours, e.g. "Opens 11:00 AM". */
  nextOpenLabel: string | null;
  /** Total minutes added to default ETAs based on store state. */
  busyDelta: number;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const venue = useVenue();
  const initial = useMemo(() => defaultsFromVenue(venue), [venue]);

  const read = useCallback(
    (): StoreState => ({ ...initial, ...loadJSON(KEY, initial) }),
    [initial],
  );

  const [state, setState] = useState<StoreState>(read);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    return subscribeToKey(KEY, () => setState(read()));
  }, [read]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    const onFocus = () => setNow(Date.now());
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // Auto-resume when paused timer expires
  useEffect(() => {
    if (state.status !== "paused" || !state.pausedUntil) return;
    const ms = state.pausedUntil - Date.now();
    if (ms <= 0) {
      const next: StoreState = {
        ...state,
        status: "open",
        pausedUntil: null,
      };
      saveJSON(KEY, next);
      setState(next);
      return;
    }
    const t = setTimeout(() => {
      const next: StoreState = {
        ...state,
        status: "open",
        pausedUntil: null,
      };
      saveJSON(KEY, next);
      setState(next);
    }, ms);
    return () => clearTimeout(t);
  }, [state]);

  const update = useCallback((next: StoreState) => {
    saveJSON(KEY, next);
    setState(next);
  }, []);

  const setOpen = useCallback(() => {
    update({
      ...state,
      status: "open",
      busyExtraMinutes: 0,
      pausedUntil: null,
      closingToday: false,
    });
  }, [update, state]);

  const setBusy = useCallback(
    (extraMinutes: number) => {
      update({
        ...state,
        status: "busy",
        busyExtraMinutes: Math.max(0, extraMinutes),
        pausedUntil: null,
        closingToday: false,
      });
    },
    [update, state],
  );

  const setPaused = useCallback(
    (durationMinutes: number | null) => {
      update({
        ...state,
        status: "paused",
        busyExtraMinutes: 0,
        pausedUntil:
          durationMinutes === null
            ? null
            : Date.now() + durationMinutes * 60_000,
        closingToday: false,
      });
    },
    [update, state],
  );

  const setClosingToday = useCallback(
    (v: boolean) => {
      update({
        ...state,
        status: "open",
        busyExtraMinutes: 0,
        pausedUntil: null,
        closingToday: v,
      });
    },
    [update, state],
  );

  const setKitchenPrepMinutes = useCallback(
    (n: number) => {
      const clamped = Math.max(5, Math.min(120, Math.round(n)));
      update({ ...state, kitchenPrepMinutes: clamped });
    },
    [state, update],
  );

  const setDayHours = useCallback(
    (dayIdx: number, hours: DayHours) => {
      const next = state.hours.map((h, i) => (i === dayIdx ? hours : h));
      update({ ...state, hours: next });
    },
    [state, update],
  );

  const setDeliveryMinSubtotal = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.round(n * 100) / 100);
      update({ ...state, deliveryMinSubtotal: clamped });
    },
    [state, update],
  );

  const setForceOpenForDemo = useCallback(
    (v: boolean) => {
      update({ ...state, forceOpenForDemo: v });
    },
    [state, update],
  );

  const isOutsideHours =
    !state.forceOpenForDemo && !isWithinWeeklyHours(state.hours, now);
  const nextOpenLabel = isOutsideHours ? formatNextOpen(state.hours, now) : null;

  const isAcceptingOrders =
    state.status !== "paused" && !state.closingToday && !isOutsideHours;

  const busyDelta = state.status === "busy" ? state.busyExtraMinutes : 0;

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      setOpen,
      setBusy,
      setPaused,
      setClosingToday,
      setKitchenPrepMinutes,
      setDayHours,
      setDeliveryMinSubtotal,
      setForceOpenForDemo,
      isAcceptingOrders,
      isOutsideHours,
      nextOpenLabel,
      busyDelta,
    }),
    [
      state,
      setOpen,
      setBusy,
      setPaused,
      setClosingToday,
      setKitchenPrepMinutes,
      setDayHours,
      setDeliveryMinSubtotal,
      setForceOpenForDemo,
      isAcceptingOrders,
      isOutsideHours,
      nextOpenLabel,
      busyDelta,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function isWithinWeeklyHours(hours: WeekHours, ts: number): boolean {
  const d = new Date(ts);
  const day = hours[d.getDay()];
  if (!day || day.closed) return false;
  const minutes = d.getHours() * 60 + d.getMinutes();
  return minutes >= day.openMinutes && minutes < day.closeMinutes;
}

export function formatTimeOfDay(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Find the next opening time after `ts` (today's later open or any future day). */
export function formatNextOpen(hours: WeekHours, ts: number): string | null {
  const d = new Date(ts);
  const today = hours[d.getDay()];
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (today && !today.closed && minutes < today.openMinutes) {
    return `Opens ${formatTimeOfDay(today.openMinutes)}`;
  }
  for (let offset = 1; offset <= 7; offset++) {
    const idx = (d.getDay() + offset) % 7;
    const day = hours[idx];
    if (!day.closed) {
      const prefix = offset === 1 ? "Opens tomorrow" : `Opens ${DAY_NAMES[idx]}`;
      return `${prefix} at ${formatTimeOfDay(day.openMinutes)}`;
    }
  }
  return null;
}
