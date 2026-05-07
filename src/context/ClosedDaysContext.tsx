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

export type ClosedDay = {
  /** Local date string `YYYY-MM-DD`. */
  date: string;
  orderCount: number;
  revenue: number;
  refundsTotal: number;
  netRevenue: number;
  topItems: { name: string; quantity: number }[];
  closedAt: number;
};

const KEY = "closeddays.v1";

function read(): ClosedDay[] {
  return loadJSON<ClosedDay[]>(KEY, []);
}

type ClosedDaysContextValue = {
  closedDays: ClosedDay[];
  isClosed: (date: string) => boolean;
  getClosed: (date: string) => ClosedDay | null;
  closeDay: (day: ClosedDay) => void;
  reopenDay: (date: string) => void;
};

const ClosedDaysContext = createContext<ClosedDaysContextValue | null>(null);

export function ClosedDaysProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<ClosedDay[]>(read);

  useEffect(() => {
    return subscribeToKey(KEY, () => setDays(read()));
  }, []);

  const update = useCallback((next: ClosedDay[]) => {
    saveJSON(KEY, next);
    setDays(next);
  }, []);

  const closeDay = useCallback(
    (day: ClosedDay) => {
      update([...days.filter((d) => d.date !== day.date), day]);
    },
    [days, update],
  );

  const reopenDay = useCallback(
    (date: string) => {
      update(days.filter((d) => d.date !== date));
    },
    [days, update],
  );

  const isClosed = useCallback(
    (date: string) => days.some((d) => d.date === date),
    [days],
  );

  const getClosed = useCallback(
    (date: string) => days.find((d) => d.date === date) ?? null,
    [days],
  );

  const value = useMemo(
    () => ({ closedDays: days, isClosed, getClosed, closeDay, reopenDay }),
    [days, isClosed, getClosed, closeDay, reopenDay],
  );

  return (
    <ClosedDaysContext.Provider value={value}>
      {children}
    </ClosedDaysContext.Provider>
  );
}

export function useClosedDays() {
  const ctx = useContext(ClosedDaysContext);
  if (!ctx)
    throw new Error("useClosedDays must be used inside ClosedDaysProvider");
  return ctx;
}

export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
