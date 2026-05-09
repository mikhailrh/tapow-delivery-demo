import { useEffect, useMemo, useState } from "react";
import {
  CloseIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "../../components/icons";
import { useOrders } from "../../context/OrdersContext";
import { useVenue } from "../../context/VenueContext";
import { formatRM, SERVICE_CHARGE_RATE, SST_RATE } from "../../lib/money";
import type {
  MenuCategory,
  MenuItem,
  ModifierGroup,
} from "../../data/menu";
import {
  selectionLabels,
  computeUnitPrice,
  type Selections,
} from "../../context/CartContext";
import type { Order, OrderLineSnapshot } from "../../lib/orders";

type WorkingLine = OrderLineSnapshot & {
  /** Marker so we can render "swapped" vs "original" subtly. */
  swappedFromName?: string;
  /** Local key for stable React keys when removing/swapping. */
  _key: string;
};

function defaultSelections(groups: ModifierGroup[] | undefined): Selections {
  const out: Selections = {};
  if (!groups) return out;
  for (const g of groups) {
    if (!g.multi && g.required && g.options[0]) {
      out[g.id] = [g.options[0].id];
    } else {
      out[g.id] = [];
    }
  }
  return out;
}

function buildSnapshot(item: MenuItem): OrderLineSnapshot {
  const selections = defaultSelections(item.modifierGroups);
  return {
    itemId: item.id,
    itemName: item.name,
    modifierLabels: selectionLabels(item, selections),
    quantity: 1,
    unitPrice: computeUnitPrice(item, selections),
  };
}

function toWorkingLines(lines: OrderLineSnapshot[]): WorkingLine[] {
  return lines.map((l, i) => ({ ...l, _key: `orig-${i}` }));
}

function summarize(original: WorkingLine[], working: WorkingLine[]): string {
  const parts: string[] = [];
  // Track original lines by key to detect remove/qty/swap.
  const origByKey = new Map(original.map((l) => [l._key, l]));
  const workingKeys = new Set(working.map((l) => l._key));

  for (const orig of original) {
    if (!workingKeys.has(orig._key)) {
      parts.push(`removed ${orig.quantity}× ${orig.itemName}`);
    }
  }
  for (const w of working) {
    const orig = origByKey.get(w._key);
    if (!orig) {
      // New line (swap result keeps the original key, so this catches only fresh adds — none in current UI).
      parts.push(`added ${w.quantity}× ${w.itemName}`);
      continue;
    }
    if (w.swappedFromName && w.itemName !== w.swappedFromName) {
      parts.push(`swapped ${w.swappedFromName} → ${w.quantity}× ${w.itemName}`);
    } else if (w.quantity !== orig.quantity) {
      parts.push(`${orig.itemName}: ${orig.quantity} → ${w.quantity}`);
    }
  }
  if (parts.length === 0) return "";
  return `Kitchen update: ${parts.join("; ")}.`;
}

function recalc(
  lines: WorkingLine[],
  deliveryFee: number,
  discount: number,
): { subtotal: number; total: number } {
  const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  const serviceCharge = subtotal * SERVICE_CHARGE_RATE;
  const sst = subtotal * SST_RATE;
  const total = Math.max(0, subtotal + serviceCharge + sst + deliveryFee - discount);
  return { subtotal, total };
}

export default function EditOrderSheet({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { applyOrderEdits } = useOrders();
  const venue = useVenue();
  const [working, setWorking] = useState<WorkingLine[]>(() =>
    toWorkingLines(order.lines),
  );
  const [substitutingFor, setSubstitutingFor] = useState<WorkingLine | null>(
    null,
  );

  const original = useMemo(() => toWorkingLines(order.lines), [order.lines]);
  const newTotals = useMemo(
    () => recalc(working, order.deliveryFee, order.discount ?? 0),
    [working, order.deliveryFee, order.discount],
  );
  const summary = useMemo(
    () => summarize(original, working),
    [original, working],
  );
  const refundDelta = +(order.total - newTotals.total).toFixed(2);
  const surchargeDelta = +(newTotals.total - order.total).toFixed(2);
  const dirty = summary.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setQty = (key: string, qty: number) => {
    if (qty < 1) return;
    setWorking((prev) =>
      prev.map((l) => (l._key === key ? { ...l, quantity: qty } : l)),
    );
  };
  const removeLine = (key: string) => {
    if (working.length <= 1) return; // Can't empty the order — vendor should reject instead.
    setWorking((prev) => prev.filter((l) => l._key !== key));
  };
  const onSubstitute = (replacement: OrderLineSnapshot) => {
    if (!substitutingFor) return;
    setWorking((prev) =>
      prev.map((l) =>
        l._key === substitutingFor._key
          ? {
              ...replacement,
              quantity: l.quantity, // preserve qty across substitution
              _key: l._key,
              swappedFromName: l.swappedFromName ?? l.itemName,
            }
          : l,
      ),
    );
    setSubstitutingFor(null);
  };

  const apply = () => {
    if (!dirty) return;
    const stripped: OrderLineSnapshot[] = working.map((l) => {
      const { _key, swappedFromName, ...rest } = l;
      void _key;
      void swappedFromName;
      return rest;
    });
    applyOrderEdits(order.id, stripped, summary);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/40">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" />
      <div
        className="relative bg-white w-full rounded-t-2xl pb-6 max-h-[90%] flex flex-col"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <div className="text-[18px] font-bold text-brand-ink">
              Edit order #{order.shortId}
            </div>
            <div className="text-[12.5px] text-brand-muted mt-0.5">
              Customer will see one combined update.
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 -mr-1 -mt-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pt-1 pb-3 flex-1">
          {working.length === 0 ? (
            <div className="text-center text-brand-muted py-6 text-[13.5px]">
              All lines removed — reject the order instead.
            </div>
          ) : (
            <ul className="space-y-3">
              {working.map((l) => {
                const orig = original.find((o) => o._key === l._key);
                const swapped = !!l.swappedFromName && l.itemName !== l.swappedFromName;
                const qtyChanged = orig && orig.quantity !== l.quantity;
                return (
                  <li
                    key={l._key}
                    className={
                      "rounded-xl border p-3 " +
                      (swapped || qtyChanged
                        ? "border-amber-300 bg-amber-50"
                        : "border-gray-200 bg-white")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-bold text-brand-ink leading-tight">
                          {l.itemName}
                        </div>
                        {l.modifierLabels.length > 0 && (
                          <div className="text-[12px] text-brand-muted leading-tight mt-0.5">
                            {l.modifierLabels.join(" · ")}
                          </div>
                        )}
                        {swapped && (
                          <div className="text-[11px] text-amber-700 mt-1">
                            Was: {l.swappedFromName}
                          </div>
                        )}
                        <div className="text-[12.5px] text-brand-ink mt-1 tabular-nums">
                          {formatRM(l.unitPrice)} ea
                        </div>
                      </div>
                      <button
                        onClick={() => removeLine(l._key)}
                        disabled={working.length <= 1}
                        aria-label="Remove line"
                        className={
                          "p-1.5 rounded-md " +
                          (working.length <= 1
                            ? "text-gray-300"
                            : "text-red-600 hover:bg-red-50")
                        }
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setQty(l._key, l.quantity - 1)}
                          disabled={l.quantity <= 1}
                          aria-label="Decrease quantity"
                          className={
                            "w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center " +
                            (l.quantity <= 1
                              ? "text-gray-300"
                              : "text-brand-ink hover:bg-brand-canvas")
                          }
                        >
                          <MinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[15px] font-bold w-6 text-center tabular-nums">
                          {l.quantity}
                        </span>
                        <button
                          onClick={() => setQty(l._key, l.quantity + 1)}
                          aria-label="Increase quantity"
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-brand-ink hover:bg-brand-canvas"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => setSubstitutingFor(l)}
                        className="px-3 py-1.5 rounded-full bg-brand-canvas text-brand-ink text-[12.5px] font-semibold hover:bg-gray-200"
                      >
                        Substitute
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 pt-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-brand-muted">Original total</span>
            <span className="text-brand-muted line-through tabular-nums">
              {formatRM(order.total)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[15px] mt-1">
            <span className="font-bold text-brand-ink">New total</span>
            <span className="font-bold text-brand-ink tabular-nums">
              {formatRM(newTotals.total)}
            </span>
          </div>
          {refundDelta > 0.01 && (
            <div className="mt-2 text-[12px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              Auto-refunds {formatRM(refundDelta)} to customer's card.
            </div>
          )}
          {surchargeDelta > 0.01 && (
            <div className="mt-2 text-[12px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Charges customer {formatRM(surchargeDelta)} more — they'll see the new total.
            </div>
          )}
          <button
            onClick={apply}
            disabled={!dirty}
            className={
              "mt-3 w-full rounded-full py-3.5 font-bold text-[14.5px] transition-colors " +
              (dirty
                ? "bg-brand-ink text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed")
            }
          >
            {dirty ? "Apply changes & notify customer" : "No changes yet"}
          </button>
        </div>
      </div>

      {substitutingFor && (
        <SubstitutePicker
          forName={substitutingFor.itemName}
          menu={venue.menu}
          onPick={onSubstitute}
          onCancel={() => setSubstitutingFor(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       Substitute picker                            */
/* ------------------------------------------------------------------ */

function SubstitutePicker({
  forName,
  menu,
  onPick,
  onCancel,
}: {
  forName: string;
  menu: MenuCategory[];
  onPick: (snapshot: OrderLineSnapshot) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const filtered: MenuCategory[] = useMemo(() => {
    if (!trimmed) return menu;
    return menu
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((it) => {
          if (it.name.toLowerCase().includes(trimmed)) return true;
          if (it.description?.toLowerCase().includes(trimmed)) return true;
          return false;
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu, trimmed]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onCancel} aria-label="Back" className="text-brand-ink font-semibold text-[14px]">
          Cancel
        </button>
        <div className="text-[14.5px] font-bold text-brand-ink">
          Sub for: {forName}
        </div>
        <div className="w-12" />
      </div>
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 bg-brand-canvas rounded-full px-4 py-2.5">
          <SearchIcon className="w-4 h-4 text-brand-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu"
            className="flex-1 bg-transparent text-[14px] focus:outline-none"
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-6">
        {filtered.length === 0 ? (
          <div className="text-center text-brand-muted py-10 text-[13.5px]">
            No items match "{query}".
          </div>
        ) : (
          filtered.map((cat) => (
            <div key={cat.id} className="mt-3">
              <div className="px-4 text-[12px] font-bold uppercase tracking-wide text-brand-muted">
                {cat.name}
              </div>
              <ul>
                {cat.items.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => onPick(buildSnapshot(it))}
                      className="w-full text-left px-4 py-3 hover:bg-brand-canvas border-b border-gray-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-brand-ink truncate">
                            {it.name}
                          </div>
                          {it.description && (
                            <div className="text-[12px] text-brand-muted truncate">
                              {it.description}
                            </div>
                          )}
                        </div>
                        <div className="text-[13px] text-brand-ink tabular-nums whitespace-nowrap">
                          {formatRM(it.price)}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
