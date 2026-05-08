import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MenuItem } from "../data/menu";

export type UnavailableAction = "remove" | "call";

/**
 * Selections map a modifier group's id to the array of selected option ids.
 * Single-select groups carry an array of length 0 or 1 for uniformity.
 */
export type Selections = Record<string, string[]>;

export type CartLine = {
  /** Unique line id — composite of item + choices + random — lets two variants of the same item coexist. */
  lineId: string;
  item: MenuItem;
  selections: Selections;
  quantity: number;
  /** Unit price snapshot — item.price plus selected options' priceDeltas (× pieces if perPiece). */
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

/** Resolve the selected size group's `pieces` (1 if no size group or no selection). */
function piecesFor(item: MenuItem, selections: Selections): number {
  const groups = item.modifierGroups;
  if (!groups) return 1;
  for (const g of groups) {
    if (g.kind !== "size") continue;
    const selectedId = selections[g.id]?.[0];
    if (!selectedId) continue;
    const opt = g.options.find((o) => o.id === selectedId);
    if (opt?.pieces) return opt.pieces;
  }
  return 1;
}

export function computeUnitPrice(
  item: MenuItem,
  selections: Selections,
): number {
  if (!item.modifierGroups) return item.price;
  const pieces = piecesFor(item, selections);
  let total = item.price;
  for (const group of item.modifierGroups) {
    const selected = selections[group.id] ?? [];
    for (const optionId of selected) {
      const opt = group.options.find((o) => o.id === optionId);
      if (!opt?.priceDelta) continue;
      total += opt.perPiece ? opt.priceDelta * pieces : opt.priceDelta;
    }
  }
  return total;
}

/** Resolve selections to display labels, in modifier-group order. */
export function selectionLabels(
  item: MenuItem,
  selections: Selections,
): string[] {
  if (!item.modifierGroups) return [];
  const out: string[] = [];
  for (const group of item.modifierGroups) {
    const selected = selections[group.id] ?? [];
    for (const optionId of selected) {
      const opt = group.options.find((o) => o.id === optionId);
      if (opt) out.push(opt.label);
    }
  }
  return out;
}

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
