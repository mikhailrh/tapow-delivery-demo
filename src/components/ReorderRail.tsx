import type { Order } from "../lib/orders";
import { formatRM } from "../lib/money";

export default function ReorderRail({
  orders,
  onReorder,
}: {
  orders: Order[];
  onReorder: (o: Order) => void;
}) {
  if (orders.length === 0) return null;
  return (
    <div className="border-b border-gray-100">
      <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
        <div className="text-[12px] font-extrabold text-brand-ink uppercase tracking-wide">
          Order again
        </div>
        <div className="text-[11px] text-brand-muted">
          {orders.length} past
        </div>
      </div>
      <div className="px-4 pb-3 -mx-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2.5 px-4 snap-x snap-mandatory">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => onReorder(o)}
              className="snap-start w-[260px] flex-shrink-0 text-left bg-brand-canvas hover:bg-gray-100 transition-colors rounded-2xl px-4 py-3 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="text-[11.5px] font-semibold text-brand-muted uppercase tracking-wide">
                  {reorderDateLabel(o.collectedAt ?? o.placedAt)}
                </div>
                <div className="text-[11.5px] text-brand-muted tabular-nums">
                  {o.lines.reduce((s, l) => s + l.quantity, 0)} item
                  {o.lines.reduce((s, l) => s + l.quantity, 0) === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-[13.5px] font-semibold text-brand-ink mt-1 leading-snug line-clamp-2">
                {reorderItemLabel(o)}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[13px] font-bold text-brand-ink tabular-nums">
                  {formatRM(o.total)}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-green">
                  Reorder
                  <svg
                    viewBox="0 0 24 24"
                    width={12}
                    height={12}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function reorderDateLabel(ts: number, now = Date.now()): string {
  const order = new Date(ts);
  const today = new Date(now);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOfDay(today) - startOfDay(order)) / (24 * 3_600_000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return order.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function reorderItemLabel(order: Order): string {
  const names = order.lines.map((l) => l.itemName);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(" · ");
  return `${names[0]}, ${names[1]}, +${names.length - 2}`;
}
