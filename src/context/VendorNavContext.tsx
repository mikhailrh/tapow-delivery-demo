import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type VendorScreen =
  | { name: "main" }
  | { name: "history" }
  | { name: "stock" }
  | { name: "orderDetail"; orderId: string };

type VendorNavContextValue = {
  screen: VendorScreen;
  go: (s: VendorScreen) => void;
  back: () => void;
  reset: () => void;
};

const VendorNavContext = createContext<VendorNavContextValue | null>(null);

export function VendorNavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<VendorScreen[]>([{ name: "main" }]);

  const go = useCallback((s: VendorScreen) => {
    setStack((prev) => [...prev, s]);
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const reset = useCallback(() => {
    setStack([{ name: "main" }]);
  }, []);

  const screen = stack[stack.length - 1];
  const value = useMemo(
    () => ({ screen, go, back, reset }),
    [screen, go, back, reset],
  );

  return (
    <VendorNavContext.Provider value={value}>
      {children}
    </VendorNavContext.Provider>
  );
}

export function useVendorNav() {
  const ctx = useContext(VendorNavContext);
  if (!ctx)
    throw new Error("useVendorNav must be used inside VendorNavProvider");
  return ctx;
}
