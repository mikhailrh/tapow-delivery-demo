import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { scopedKey } from "../lib/sync";

export type Perspective = "customer" | "vendor" | "manager";

const STORAGE_SUFFIX = "perspective";

type PerspectiveContextValue = {
  perspective: Perspective;
  setPerspective: (p: Perspective) => void;
};

const PerspectiveContext = createContext<PerspectiveContextValue | null>(null);

function readInitial(): Perspective {
  if (typeof localStorage === "undefined") return "customer";
  const raw = localStorage.getItem(scopedKey(STORAGE_SUFFIX));
  if (raw === "vendor") return "vendor";
  if (raw === "manager") return "manager";
  return "customer";
}

export function PerspectiveProvider({ children }: { children: ReactNode }) {
  const [perspective, setPerspectiveState] =
    useState<Perspective>(readInitial);

  const setPerspective = useCallback((p: Perspective) => {
    setPerspectiveState(p);
    try {
      localStorage.setItem(scopedKey(STORAGE_SUFFIX), p);
    } catch {
      /* quota / SSR */
    }
  }, []);

  const value = useMemo(
    () => ({ perspective, setPerspective }),
    [perspective, setPerspective],
  );

  return (
    <PerspectiveContext.Provider value={value}>
      {children}
    </PerspectiveContext.Provider>
  );
}

export function usePerspective() {
  const ctx = useContext(PerspectiveContext);
  if (!ctx)
    throw new Error("usePerspective must be used inside PerspectiveProvider");
  return ctx;
}
