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

const KEY = "stock.v2";

export type StockState = {
  disabledItemIds: string[];
};

const initial: StockState = {
  disabledItemIds: [],
};

type StockContextValue = {
  state: StockState;
  isItemAvailable: (itemId: string) => boolean;
  toggleItem: (itemId: string) => void;
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
        disabledItemIds: exists
          ? state.disabledItemIds.filter((x) => x !== itemId)
          : [...state.disabledItemIds, itemId],
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

  const value = useMemo<StockContextValue>(
    () => ({
      state,
      isItemAvailable,
      toggleItem,
      bringEverythingBack,
    }),
    [state, isItemAvailable, toggleItem, bringEverythingBack],
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used inside StockProvider");
  return ctx;
}
