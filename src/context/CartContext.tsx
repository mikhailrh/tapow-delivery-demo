import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  DipType,
  HeatLevel,
  MenuItem,
  OptionalAddon,
  SideType,
  SizeVariant,
} from "../data/menu";

export type UnavailableAction = "remove" | "call";

export type CartLine = {
  /** Unique line id — composite of item + choices + random — lets two variants of the same item coexist. */
  lineId: string;
  item: MenuItem;
  size?: SizeVariant;
  heat?: HeatLevel;
  heatUpcharge?: number;
  dip?: DipType;
  side?: SideType;
  addons: OptionalAddon[];
  quantity: number;
  /** Unit price snapshot — item base + size diff + heat upcharge × pieces + addons. */
  unitPrice: number;
  /** Per-item note from the customer (free text, optional). */
  itemNote?: string;
  /** What the kitchen should do if this item is sold out. Defaults to "remove". */
  unavailableAction?: UnavailableAction;
};

type CartContextValue = {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "lineId" | "quantity"> & { quantity?: number }) => void;
  updateQty: (lineId: string, qty: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  note: string;
  setNote: (v: string) => void;
  /** Promo code the customer entered + accepted at the cart screen. */
  promoCode: string | null;
  setPromoCode: (v: string | null) => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export const computeUnitPrice = (
  item: MenuItem,
  size: SizeVariant | undefined,
  heatUpcharge: number,
  pieces: number,
  addons: OptionalAddon[],
) => {
  const base = size ? size.price : item.price;
  const heat = heatUpcharge * pieces;
  const addonSum = addons.reduce((s, a) => s + a.price, 0);
  return base + heat + addonSum;
};

let nextId = 1;
const makeLineId = () => `line-${Date.now()}-${nextId++}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [promoCode, setPromoCode] = useState<string | null>(null);

  const addLine: CartContextValue["addLine"] = useCallback((partial) => {
    setLines((prev) => [
      ...prev,
      { ...partial, lineId: makeLineId(), quantity: partial.quantity ?? 1 },
    ]);
  }, []);

  const updateQty = useCallback((lineId: string, qty: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, quantity: qty } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setNote("");
    setPromoCode(null);
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [lines],
  );
  const itemCount = useMemo(
    () => lines.reduce((s, l) => s + l.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      addLine,
      updateQty,
      removeLine,
      clear,
      note,
      setNote,
      promoCode,
      setPromoCode,
      subtotal,
      itemCount,
    }),
    [
      lines,
      addLine,
      updateQty,
      removeLine,
      clear,
      note,
      promoCode,
      subtotal,
      itemCount,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
