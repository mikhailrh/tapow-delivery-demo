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
import type { HeatLevel } from "../data/menu";

const KEY = "stock.v1";

export type StockState = {
  disabledItemIds: string[];
  disabledHeats: HeatLevel[];
};

const initial: StockState = {
  disabledItemIds: [],
  disabledHeats: [],
};

type StockContextValue = {
  state: StockState;
  isItemAvailable: (itemId: string) => boolean;
  isHeatAvailable: (heat: HeatLevel) => boolean;
  toggleItem: (itemId: string) => void;
  toggleHeat: (heat: HeatLevel) => void;
  bringEverythingBack: () => void;
};

const StockContext = createContext<StockContextValue | null>(null);

function read(): StockState {
  return loadJSON(KEY, initial);
}

function commit(s: StockState) {
  saveJSON(KEY, s);
}

export function StockProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StockState>(read);

  useEffect(() => {
    return subscribeToKey(KEY, () => setState(read()));
  }, []);

  const update = useCallback((next: StockState) => {
    commit(next);
    setState(next);
  }, []);

  const toggleItem = useCallback(
    (itemId: string) => {
      const exists = state.disabledItemIds.includes(itemId);
      update({
        ...state,
        disabledItemIds: exists
          ? state.disabledItemIds.filter((x) => x !== itemId)
          : [...state.disabledItemIds, itemId],
      });
    },
    [state, update],
  );

  const toggleHeat = useCallback(
    (heat: HeatLevel) => {
      const exists = state.disabledHeats.includes(heat);
      update({
        ...state,
        disabledHeats: exists
          ? state.disabledHeats.filter((x) => x !== heat)
          : [...state.disabledHeats, heat],
      });
    },
    [state, update],
  );

  const bringEverythingBack = useCallback(() => {
    update(initial);
  }, [update]);

  const isItemAvailable = useCallback(
    (id: string) => !state.disabledItemIds.includes(id),
    [state.disabledItemIds],
  );

  const isHeatAvailable = useCallback(
    (heat: HeatLevel) => !state.disabledHeats.includes(heat),
    [state.disabledHeats],
  );

  const value = useMemo<StockContextValue>(
    () => ({
      state,
      isItemAvailable,
      isHeatAvailable,
      toggleItem,
      toggleHeat,
      bringEverythingBack,
    }),
    [state, isItemAvailable, isHeatAvailable, toggleItem, toggleHeat, bringEverythingBack],
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used inside StockProvider");
  return ctx;
}
