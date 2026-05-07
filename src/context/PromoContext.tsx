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

export type PromoType = "percent" | "flat";

export type PromoWindow = {
  /** 0 = Sun, 6 = Sat. Empty = every day. */
  days: number[];
  /** Minutes from midnight. e.g. 12*60 = 720. */
  startMinutes: number;
  endMinutes: number;
};

export type Promo = {
  id: string;
  /** null/undefined → auto-applied within window. String → user enters at checkout. */
  code?: string;
  /** Display name on banner / receipt line. */
  label: string;
  type: PromoType;
  /** Percent (10 = 10%) or flat ringgit (5 = RM5). */
  value: number;
  minSubtotal?: number;
  /** ms timestamp; absent = no expiry. */
  expiry?: number;
  oneTimeUse?: boolean;
  /** Auto-apply window (only meaningful when code is unset). */
  window?: PromoWindow;
  active: boolean;
};

export type PromoApplyResult =
  | { ok: true; promo: Promo; discount: number; label: string }
  | { ok: false; reason: string };

const KEY = "promos.v1";

const DAY_MS = 24 * 60 * 60 * 1000;

function defaultPromos(): Promo[] {
  return [
    {
      id: "auto-lunch",
      label: "Lunch deal",
      type: "percent",
      value: 10,
      window: { days: [], startMinutes: 12 * 60, endMinutes: 14 * 60 },
      active: true,
    },
    {
      id: "auto-happy",
      label: "Happy hour",
      type: "flat",
      value: 5,
      minSubtotal: 30,
      window: { days: [], startMinutes: 17 * 60, endMinutes: 23 * 60 + 59 },
      active: true,
    },
    {
      id: "code-shaq20",
      code: "SHAQ20",
      label: "SHAQ20",
      type: "percent",
      value: 20,
      active: true,
    },
    {
      id: "code-fowl10",
      code: "FOWL10",
      label: "FOWL10",
      type: "flat",
      value: 10,
      minSubtotal: 40,
      expiry: Date.now() + 14 * DAY_MS,
      active: true,
    },
  ];
}

function read(): Promo[] {
  return loadJSON<Promo[]>(KEY, defaultPromos());
}

function commit(p: Promo[]) {
  saveJSON(KEY, p);
}

type PromoContextValue = {
  promos: Promo[];
  /** Auto-promos active right now (filtered by window/expiry/active). */
  activeAutoPromos: Promo[];
  /** Best (highest discount) auto-promo for a given subtotal — or null. */
  bestAutoFor: (subtotal: number) => Promo | null;
  /** Validate a code against current state + subtotal. */
  applyCode: (code: string, subtotal: number) => PromoApplyResult;
  computeDiscount: (promo: Promo, subtotal: number) => number;
  addPromo: (p: Omit<Promo, "id">) => void;
  togglePromo: (id: string) => void;
  removePromo: (id: string) => void;
  resetToDefaults: () => void;
};

const PromoContext = createContext<PromoContextValue | null>(null);

export function PromoProvider({ children }: { children: ReactNode }) {
  const [promos, setPromos] = useState<Promo[]>(read);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    return subscribeToKey(KEY, () => setPromos(read()));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const update = useCallback((next: Promo[]) => {
    commit(next);
    setPromos(next);
  }, []);

  const computeDiscount = useCallback((promo: Promo, subtotal: number) => {
    if (promo.minSubtotal && subtotal < promo.minSubtotal) return 0;
    if (promo.type === "percent") {
      return Math.round(subtotal * promo.value) / 100;
    }
    return Math.min(promo.value, subtotal);
  }, []);

  const isWithinWindow = useCallback((p: Promo, ts: number) => {
    if (!p.window) return true;
    const d = new Date(ts);
    if (p.window.days.length > 0 && !p.window.days.includes(d.getDay()))
      return false;
    const minutes = d.getHours() * 60 + d.getMinutes();
    return minutes >= p.window.startMinutes && minutes < p.window.endMinutes;
  }, []);

  const isLive = useCallback(
    (p: Promo, ts: number) => {
      if (!p.active) return false;
      if (p.expiry && ts > p.expiry) return false;
      return isWithinWindow(p, ts);
    },
    [isWithinWindow],
  );

  const activeAutoPromos = useMemo(
    () => promos.filter((p) => !p.code && isLive(p, now)),
    [promos, isLive, now],
  );

  const bestAutoFor = useCallback(
    (subtotal: number) => {
      let best: Promo | null = null;
      let bestAmt = 0;
      for (const p of activeAutoPromos) {
        const amt = computeDiscount(p, subtotal);
        if (amt > bestAmt) {
          best = p;
          bestAmt = amt;
        }
      }
      return best;
    },
    [activeAutoPromos, computeDiscount],
  );

  const applyCode = useCallback<PromoContextValue["applyCode"]>(
    (raw, subtotal) => {
      const code = raw.trim().toUpperCase();
      if (!code) return { ok: false, reason: "Enter a code." };
      const p = promos.find(
        (x) => (x.code ?? "").toUpperCase() === code,
      );
      if (!p) return { ok: false, reason: "That code doesn't exist." };
      if (!p.active) return { ok: false, reason: "That code isn't active." };
      if (p.expiry && Date.now() > p.expiry)
        return { ok: false, reason: "That code has expired." };
      if (p.minSubtotal && subtotal < p.minSubtotal)
        return {
          ok: false,
          reason: `Add RM${(p.minSubtotal - subtotal).toFixed(2)} more to use this code.`,
        };
      const discount = computeDiscount(p, subtotal);
      if (discount <= 0)
        return { ok: false, reason: "Doesn't apply to this cart." };
      return { ok: true, promo: p, discount, label: p.label };
    },
    [promos, computeDiscount],
  );

  const addPromo = useCallback<PromoContextValue["addPromo"]>(
    (p) => {
      const id = `promo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      update([...promos, { ...p, id }]);
    },
    [promos, update],
  );

  const togglePromo = useCallback(
    (id: string) => {
      update(
        promos.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
      );
    },
    [promos, update],
  );

  const removePromo = useCallback(
    (id: string) => {
      update(promos.filter((p) => p.id !== id));
    },
    [promos, update],
  );

  const resetToDefaults = useCallback(() => {
    update(defaultPromos());
  }, [update]);

  const value = useMemo<PromoContextValue>(
    () => ({
      promos,
      activeAutoPromos,
      bestAutoFor,
      applyCode,
      computeDiscount,
      addPromo,
      togglePromo,
      removePromo,
      resetToDefaults,
    }),
    [
      promos,
      activeAutoPromos,
      bestAutoFor,
      applyCode,
      computeDiscount,
      addPromo,
      togglePromo,
      removePromo,
      resetToDefaults,
    ],
  );

  return (
    <PromoContext.Provider value={value}>{children}</PromoContext.Provider>
  );
}

export function usePromos() {
  const ctx = useContext(PromoContext);
  if (!ctx) throw new Error("usePromos must be used inside PromoProvider");
  return ctx;
}

/** Format a window as "until 2:00 PM" or "12:00 PM – 2:00 PM". */
export function formatWindow(w: PromoWindow): string {
  const fmt = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };
  return `${fmt(w.startMinutes)} – ${fmt(w.endMinutes)}`;
}
