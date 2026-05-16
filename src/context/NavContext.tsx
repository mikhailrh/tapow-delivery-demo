import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Screen =
  | { name: "menu"; jumpTo?: string }
  | { name: "item"; itemId: string }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "confirmation"; orderId?: string }
  | { name: "whatsapp"; orderId?: string }
  | { name: "orderChat"; orderId: string };

type NavContextValue = {
  screen: Screen;
  go: (s: Screen) => void;
  back: () => void;
};

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([{ name: "menu" }]);

  const go = useCallback((s: Screen) => {
    setStack((prev) => [...prev, s]);
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const screen = stack[stack.length - 1];

  const value = useMemo(() => ({ screen, go, back }), [screen, go, back]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used inside NavProvider");
  return ctx;
}
