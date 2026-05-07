import { useMemo, useState } from "react";
import { useOrders } from "../../context/OrdersContext";
import { useVendorNav } from "../../context/VendorNavContext";
import { BackIcon, SearchIcon, CloseIcon } from "../../components/icons";
import { formatRM } from "../../lib/money";
import type { Order, OrderStatus } from "../../lib/orders";

type Filter = "all" | "delivered" | "rejected";

export default function VendorHistoryScreen() {
  const { orders } = useOrders();
  const { back, go } = useVendorNav();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const sevenDaysAgo = Date.now() - 7 * 24 * 3_600_000;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => o.placedAt >= sevenDaysAgo)
      .filter((o) =>
        filter === "all"
          ? true
          : filter === "delivered"
          ? o.status === "collected"
          : o.status === "rejected",
      )
      .filter((o) => {
        if (!q) return true;
        return (
          o.shortId.includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.placedAt - a.placedAt);
  }, [orders, query, filter, sevenDaysAgo]);

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="px-4 lg:px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={back} aria-label="Back" className="p-1 -ml-1">
          <BackIcon className="w-6 h-6 text-brand-ink" />
        </button>
        <div className="flex-1">
          <div className="text-[16px] font-bold text-brand-ink leading-tight">
            History
          </div>
          <div className="text-[11.5px] text-brand-muted">
            Last 7 days · {filtered.length} orders
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-5 py-3 flex items-center gap-2 border-b border-gray-100">
        <div className="flex-1 flex items-center gap-2 bg-brand-canvas rounded-full px-3.5 py-2">
          <SearchIcon className="w-4 h-4 text-brand-muted flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or order #"
            className="flex-1 bg-transparent text-[13.5px] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="w-5 h-5 rounded-full bg-brand-muted/40 flex items-center justify-center"
            >
              <CloseIcon className="w-3 h-3 text-white" strokeWidth={3} />
            </button>
          )}
        </div>
        <div className="flex bg-brand-canvas rounded-full p-0.5">
          {(["all", "delivered", "rejected"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "px-2.5 py-1.5 rounded-full text-[12px] font-bold capitalize " +
                (filter === f
                  ? "bg-white shadow-sm text-brand-ink"
                  : "text-brand-muted")
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-5 pt-16 text-center text-brand-muted text-[14px]">
            No orders match.
          </div>
        ) : (
          <ul>
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => go({ name: "orderDetail", orderId: o.id })}
                  className="w-full px-4 lg:px-5 py-3 flex items-center gap-3 border-b border-gray-50 hover:bg-brand-canvas/60 transition-colors text-left"
                >
                  <div className="text-[15px] font-extrabold text-brand-ink w-12 tabular-nums">
                    #{o.shortId}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-brand-ink truncate">
                      {o.customerName}{" "}
                      <span className="text-brand-muted font-normal">
                        · {o.fulfillment}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-brand-muted truncate">
                      {timeAgo(o.placedAt)} · {o.lines.length} item
                      {o.lines.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13.5px] font-bold text-brand-ink tabular-nums">
                      {formatRM(o.total)}
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<
    OrderStatus,
    { label: string; classes: string }
  > = {
    incoming: { label: "Incoming", classes: "bg-brand-green/15 text-brand-green" },
    cooking: { label: "Cooking", classes: "bg-amber-100 text-amber-800" },
    ready: { label: "Ready", classes: "bg-blue-100 text-blue-800" },
    collected: { label: "Delivered", classes: "bg-gray-100 text-brand-muted" },
    rejected: { label: "Refunded", classes: "bg-red-50 text-red-700" },
    cancelled: { label: "Cancelled", classes: "bg-red-50 text-red-700" },
  };
  const s = map[status];
  return (
    <span
      className={
        "inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mt-0.5 " +
        s.classes
      }
    >
      {s.label}
    </span>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export type _historyOrder = Order;
