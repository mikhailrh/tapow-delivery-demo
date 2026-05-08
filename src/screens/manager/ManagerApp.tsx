import { useEffect, useMemo, useState } from "react";
import { useOrders } from "../../context/OrdersContext";
import { useStore, type DayHours } from "../../context/StoreContext";
import { useStock } from "../../context/StockContext";
import { useVenue } from "../../context/VenueContext";
import { useVenueProfile } from "../../context/VenueProfileContext";
import {
  useClosedDays,
  dateKey,
  type ClosedDay,
} from "../../context/ClosedDaysContext";
import {
  usePromos,
  formatWindow,
  type Promo,
  type PromoType,
} from "../../context/PromoContext";
import type { MenuCategory } from "../../data/menu";
import { formatRM } from "../../lib/money";
import { elapsedLabel, type Order } from "../../lib/orders";
import {
  HistoryIcon,
  FlameIcon,
  StoreIcon,
  PauseIcon,
  RotateIcon,
  SettingsIcon,
  ChevronRightIcon,
  CloseIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
} from "../../components/icons";

type Tab = "today" | "history" | "stock" | "promos" | "settings";

export default function ManagerApp() {
  const [tab, setTab] = useState<Tab>("today");

  return (
    <div className="relative flex-1 flex flex-col bg-brand-canvas overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {tab === "today" && <TodayScreen />}
        {tab === "history" && <HistoryScreen />}
        {tab === "stock" && <StockScreen />}
        {tab === "promos" && <PromosScreen />}
        {tab === "settings" && <SettingsScreen />}
      </div>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         Today (dashboard)                          */
/* ------------------------------------------------------------------ */

function TodayScreen() {
  const { orders } = useOrders();
  const { state: storeState, setPaused, setOpen } = useStore();
  const { isClosed, getClosed, closeDay } = useClosedDays();
  const venue = useVenue();
  const [now, setNow] = useState(() => Date.now());
  const [closeoutSheet, setCloseoutSheet] = useState<ClosedDay | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todays = useMemo(
    () =>
      orders.filter(
        (o) => o.placedAt >= todayMidnight && o.status !== "rejected" && o.status !== "cancelled",
      ),
    [orders, todayMidnight],
  );
  const revenue = todays.reduce((s, o) => s + o.total, 0);
  const avgTicket = todays.length === 0 ? 0 : revenue / todays.length;

  const incoming = orders.filter((o) => o.status === "incoming");
  const cooking = orders.filter((o) => o.status === "cooking");
  const ready = orders.filter((o) => o.status === "ready");

  const oldestWaiting = useMemo(() => {
    const candidates = [...incoming, ...cooking, ...ready];
    if (candidates.length === 0) return null;
    return candidates.reduce((oldest, o) =>
      o.placedAt < oldest.placedAt ? o : oldest,
    );
  }, [incoming, cooking, ready]);

  const lateOrders = useMemo(() => {
    return cooking.filter((o) => {
      if (!o.acceptedAt || !o.prepMinutes) return false;
      const elapsed = (now - o.acceptedAt) / 60_000;
      return elapsed > o.prepMinutes;
    });
  }, [cooking, now]);

  const todayKey = dateKey(now);
  const todayClosed = isClosed(todayKey);
  const todayCloseoutRecord = getClosed(todayKey);
  const todayDay = storeState.hours[new Date(now).getDay()];
  const currentMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const pastCloseTime =
    todayDay && !todayDay.closed && currentMin >= todayDay.closeMinutes;

  const buildCloseout = (): ClosedDay => {
    const refundsTotal = todays.reduce(
      (s, o) => s + (o.refund?.amount ?? 0),
      0,
    );
    const itemTotals = new Map<string, number>();
    for (const o of todays) {
      for (const l of o.lines) {
        itemTotals.set(
          l.itemName,
          (itemTotals.get(l.itemName) ?? 0) + l.quantity,
        );
      }
    }
    const topItems = [...itemTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, quantity]) => ({ name, quantity }));
    return {
      date: todayKey,
      orderCount: todays.length,
      revenue,
      refundsTotal,
      netRevenue: revenue - refundsTotal,
      topItems,
      closedAt: Date.now(),
    };
  };

  const onCloseDay = () => {
    setCloseoutSheet(buildCloseout());
  };

  const confirmCloseout = () => {
    if (!closeoutSheet) return;
    closeDay(closeoutSheet);
    setCloseoutSheet(null);
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Greeting */}
      <div className="px-5 pt-6 pb-2">
        <div className="text-[12.5px] text-brand-muted">
          {greetByHour(new Date())} · {venue.name}
        </div>
        <div className="text-[26px] font-extrabold text-brand-ink leading-tight">
          {storeState.closingToday
            ? "You're closed for the day."
            : storeState.status === "paused"
            ? "You're paused."
            : storeState.status === "busy"
            ? "Things are busy."
            : lateOrders.length > 0
            ? "Someone's running late."
            : oldestWaiting
            ? "Everything's moving."
            : "All quiet."}
        </div>
      </div>

      {/* Today banner */}
      <div className="mx-4 rounded-2xl bg-brand-ink text-white p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wide opacity-60">
            Today
          </div>
          {todayClosed && (
            <span className="text-[10px] uppercase tracking-wide bg-emerald-500/20 text-emerald-200 font-bold px-1.5 py-0.5 rounded">
              Day closed
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[36px] font-extrabold leading-none tabular-nums">
            {formatRM(revenue)}
          </span>
          <span className="text-[12px] opacity-60">revenue</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ManagerStat label="Orders" value={`${todays.length}`} />
          <ManagerStat label="Avg ticket" value={formatRM(avgTicket)} />
        </div>

        {todayClosed && todayCloseoutRecord ? (
          <div className="mt-4 rounded-xl bg-white/5 px-3.5 py-2.5 text-[11.5px] leading-relaxed">
            <div className="opacity-70">Closed at</div>
            <div className="font-semibold tabular-nums">
              {new Date(todayCloseoutRecord.closedAt).toLocaleTimeString(
                "en-US",
                { hour: "numeric", minute: "2-digit" },
              )}
              {todayCloseoutRecord.refundsTotal > 0 &&
                ` · ${formatRM(todayCloseoutRecord.refundsTotal)} refunded`}
            </div>
          </div>
        ) : pastCloseTime ? (
          <button
            onClick={onCloseDay}
            className="mt-4 w-full rounded-xl bg-brand-green text-white py-2.5 text-[13px] font-bold"
          >
            Close day · review summary
          </button>
        ) : (
          <div className="mt-4 text-[11px] opacity-50">
            Close-day available after{" "}
            {todayDay && !todayDay.closed
              ? formatMinutesAsTime(todayDay.closeMinutes)
              : "today's close time"}
          </div>
        )}
      </div>

      {/* Live status */}
      <div className="mt-4 mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-bold text-brand-muted uppercase tracking-wide">
            Live status
          </div>
          <StoreStatusPill state={storeState} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <PendingChip
            count={incoming.length}
            label="Incoming"
            tone="text-brand-green"
          />
          <PendingChip
            count={cooking.length}
            label="Cooking"
            tone="text-amber-600"
          />
          <PendingChip
            count={ready.length}
            label="Ready"
            tone="text-blue-600"
          />
        </div>

        {oldestWaiting && (
          <div className="mt-3 flex items-center gap-2.5 bg-brand-canvas rounded-xl px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wide text-brand-muted flex-shrink-0">
              Oldest
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-brand-ink truncate">
                #{oldestWaiting.shortId} · {oldestWaiting.customerName}
              </div>
              <div className="text-[11.5px] text-brand-muted">
                placed {elapsedLabel(now, oldestWaiting.placedAt)} ago ·{" "}
                {oldestWaiting.status}
              </div>
            </div>
          </div>
        )}

        {lateOrders.length > 0 && (
          <div className="mt-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
            <div className="text-[12px] font-bold text-red-800">
              {lateOrders.length} order{lateOrders.length === 1 ? "" : "s"}{" "}
              past prep time
            </div>
            <div className="text-[11.5px] text-red-700/90 mt-0.5">
              {lateOrders
                .slice(0, 2)
                .map((o) => `#${o.shortId} ${o.customerName}`)
                .join(", ")}
              {lateOrders.length > 2 && ` + ${lateOrders.length - 2} more`}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-4 mx-4">
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-muted px-1 mb-2">
          Quick actions
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {storeState.status === "paused" || storeState.closingToday ? (
            <ActionRow
              icon={<StoreIcon className="w-5 h-5" />}
              tone="text-brand-green"
              label="Force-reopen store"
              sub="Resume taking orders right now"
              onClick={setOpen}
            />
          ) : (
            <ActionRow
              icon={<PauseIcon className="w-5 h-5" />}
              tone="text-red-600"
              label="Force-pause store"
              sub="Stop new orders for 30 minutes"
              onClick={() => setPaused(30)}
            />
          )}
          <ActionRow
            icon={<FlameIcon className="w-5 h-5" />}
            tone="text-amber-600"
            label="Push 86 update"
            sub="Mark items sold out for today"
            onClick={() => {
              // bottom-nav controlled, switch via custom event
              window.dispatchEvent(new CustomEvent("manager:goto-stock"));
            }}
          />
        </div>
      </div>

      <p className="text-[11px] text-brand-muted text-center px-6 mt-6 leading-relaxed">
        Tap to operate · for the floor view, switch to Vendor in Demo controls.
      </p>

      {closeoutSheet && (
        <CloseoutSheet
          summary={closeoutSheet}
          onClose={() => setCloseoutSheet(null)}
          onConfirm={confirmCloseout}
        />
      )}
    </div>
  );
}

function formatMinutesAsTime(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function CloseoutSheet({
  summary,
  onClose,
  onConfirm,
}: {
  summary: ClosedDay;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl w-full max-w-[440px] shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold text-brand-ink">Close day</div>
            <div className="text-[11.5px] text-brand-muted">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <SummaryStat label="Orders" value={`${summary.orderCount}`} />
            <SummaryStat label="Revenue" value={formatRM(summary.revenue)} />
            <SummaryStat
              label="Refunds"
              value={`-${formatRM(summary.refundsTotal)}`}
            />
            <SummaryStat
              label="Net"
              value={formatRM(summary.netRevenue)}
              highlight
            />
          </div>
          <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-2">
            Top items
          </div>
          {summary.topItems.length === 0 ? (
            <div className="text-[12.5px] text-brand-muted">
              No items sold today.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {summary.topItems.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-[13px]"
                >
                  <span className="font-semibold text-brand-ink">
                    {i + 1}. {t.name}
                  </span>
                  <span className="text-brand-muted tabular-nums">
                    ×{t.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-brand-canvas text-brand-ink rounded-full py-3 font-semibold text-[14px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-brand-ink text-white rounded-full py-3 font-semibold text-[14px]"
          >
            Confirm close
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl px-3 py-2 " +
        (highlight ? "bg-brand-ink text-white" : "bg-brand-canvas")
      }
    >
      <div
        className={
          "text-[10.5px] uppercase tracking-wide " +
          (highlight ? "opacity-60" : "text-brand-muted")
        }
      >
        {label}
      </div>
      <div className="text-[16px] font-bold tabular-nums leading-tight mt-0.5">
        {value}
      </div>
    </div>
  );
}

function ManagerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wide opacity-60">
        {label}
      </div>
      <div className="text-[18px] font-bold tabular-nums leading-tight mt-0.5">
        {value}
      </div>
    </div>
  );
}

function PendingChip({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: string;
}) {
  return (
    <div
      className={
        "rounded-xl py-2 px-2 " +
        (count === 0 ? "bg-brand-canvas" : "bg-brand-canvas")
      }
    >
      <div className={"text-[26px] font-extrabold leading-none " + tone}>
        {count}
      </div>
      <div className="text-[10.5px] text-brand-muted uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}

function StoreStatusPill({
  state,
}: {
  state: ReturnType<typeof useStore>["state"];
}) {
  const dotClass = state.closingToday
    ? "bg-gray-700"
    : state.status === "open"
    ? "bg-green-500"
    : state.status === "busy"
    ? "bg-amber-500"
    : "bg-red-500";
  const chipClass = state.closingToday
    ? "bg-gray-100 text-gray-800"
    : state.status === "open"
    ? "bg-green-50 text-green-800"
    : state.status === "busy"
    ? "bg-amber-50 text-amber-800"
    : "bg-red-50 text-red-800";
  const label = state.closingToday
    ? "Closing today"
    : state.status === "open"
    ? "Open"
    : state.status === "busy"
    ? `Busy +${state.busyExtraMinutes}m`
    : "Paused";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold " +
        chipClass
      }
    >
      <span className={"w-1.5 h-1.5 rounded-full " + dotClass} />
      {label}
    </span>
  );
}

function ActionRow({
  icon,
  label,
  sub,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-brand-canvas/60 transition-colors text-left"
    >
      <span
        className={
          "w-9 h-9 rounded-full bg-brand-canvas flex items-center justify-center " +
          tone
        }
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-brand-ink leading-tight">
          {label}
        </div>
        <div className="text-[11.5px] text-brand-muted leading-tight mt-0.5">
          {sub}
        </div>
      </div>
      <ChevronRightIcon className="w-5 h-5 text-brand-muted flex-shrink-0" />
    </button>
  );
}

function greetByHour(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

/* ------------------------------------------------------------------ */
/*                            History                                 */
/* ------------------------------------------------------------------ */

function HistoryScreen() {
  const { orders } = useOrders();
  const { isClosed } = useClosedDays();
  const sevenDaysAgo = useMemo(() => Date.now() - 7 * 24 * 3_600_000, []);
  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const [selected, setSelected] = useState<Order | null>(null);

  const list = useMemo(
    () =>
      orders
        .filter((o) => o.placedAt >= sevenDaysAgo)
        .sort((a, b) => b.placedAt - a.placedAt),
    [orders, sevenDaysAgo],
  );

  const todayRevenue = orders
    .filter((o) => o.placedAt >= todayMidnight && o.status !== "rejected" && o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const sevenDayRevenue = list
    .filter((o) => o.status !== "rejected" && o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-5 pt-6 pb-3">
        <div className="text-[12.5px] text-brand-muted">Last 7 days</div>
        <div className="text-[24px] font-extrabold text-brand-ink leading-tight">
          History
        </div>
      </div>

      <div className="mx-4 grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
          <div className="text-[10.5px] uppercase tracking-wide text-brand-muted">
            Today
          </div>
          <div className="text-[16px] font-bold text-brand-ink tabular-nums">
            {formatRM(todayRevenue)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
          <div className="text-[10.5px] uppercase tracking-wide text-brand-muted">
            7-day total
          </div>
          <div className="text-[16px] font-bold text-brand-ink tabular-nums">
            {formatRM(sevenDayRevenue)}
          </div>
        </div>
      </div>

      <div className="bg-white border-y border-gray-100">
        {list.length === 0 ? (
          <div className="px-5 py-12 text-center text-brand-muted text-[14px]">
            No orders yet.
          </div>
        ) : (
          list.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o)}
              className="w-full px-4 py-3 flex items-center gap-3 border-b border-gray-50 hover:bg-brand-canvas/60 transition-colors text-left"
            >
              <div className="text-[14px] font-extrabold text-brand-ink w-12 tabular-nums">
                #{o.shortId}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-brand-ink truncate">
                  {o.customerName}
                </div>
                <div className="text-[11.5px] text-brand-muted truncate capitalize">
                  {o.fulfillment} ·{" "}
                  {new Date(o.placedAt).toLocaleString("en-US", {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13.5px] font-bold text-brand-ink tabular-nums">
                  {formatRM(o.total)}
                </div>
                <div
                  className={
                    "text-[10.5px] font-bold uppercase tracking-wide " +
                    (o.status === "rejected" || o.status === "cancelled"
                      ? "text-red-600"
                      : o.status === "collected"
                      ? "text-brand-muted"
                      : "text-brand-green")
                  }
                >
                  {o.status === "collected"
                    ? "Done"
                    : o.status === "rejected"
                    ? "Refunded"
                    : o.status === "cancelled"
                    ? "Cancelled"
                    : o.status}
                </div>
                {isClosed(dateKey(o.placedAt)) && (
                  <div className="text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded mt-0.5 inline-block">
                    Day closed
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <ManagerOrderSheet
          order={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ManagerOrderSheet({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { issueRefund } = useOrders();
  const [refundOpen, setRefundOpen] = useState(false);
  const eligible = managerRefundEligible(order);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl w-full max-h-[85%] overflow-y-auto shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="sticky top-0 bg-white px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold text-brand-ink">
              Order #{order.shortId}
            </div>
            <div className="text-[11.5px] text-brand-muted capitalize">
              {order.customerName} · {order.fulfillment}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="px-5 py-4">
          {order.lines.map((l, i) => (
            <div
              key={i}
              className="flex justify-between gap-3 py-2 border-b border-gray-50 last:border-b-0 text-[13.5px]"
            >
              <div>
                <div className="font-semibold text-brand-ink">
                  {l.quantity}× {l.itemName}
                </div>
                {l.modifierLabels.length > 0 && (
                  <div className="text-brand-muted text-[11.5px]">
                    {l.modifierLabels.join(" · ")}
                  </div>
                )}
              </div>
              <div className="font-semibold text-brand-ink tabular-nums">
                {formatRM(l.unitPrice * l.quantity)}
              </div>
            </div>
          ))}
          <div className="mt-3 flex justify-between text-[14px] font-bold text-brand-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatRM(order.total)}</span>
          </div>

          {order.refund && (
            <div
              className={
                "mt-3 rounded-xl px-3 py-2.5 text-[13px] " +
                (order.refund.status === "processed"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-amber-50 border border-amber-200 text-amber-900")
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {order.refund.status === "processed"
                    ? "Refunded"
                    : "Refund pending"}
                </span>
                <span className="font-bold tabular-nums">
                  {formatRM(order.refund.amount)}
                </span>
              </div>
              <div className="text-[11.5px] mt-0.5 opacity-80">
                {order.refund.reason}
                {order.refund.note ? ` · ${order.refund.note}` : ""}
              </div>
            </div>
          )}

          <div className="mt-4">
            {eligible ? (
              <button
                onClick={() => setRefundOpen(true)}
                disabled={order.refund?.status === "pending"}
                className={
                  "w-full font-semibold rounded-full py-3 text-[13.5px] " +
                  (order.refund?.status === "pending"
                    ? "bg-amber-100 text-amber-700 cursor-not-allowed"
                    : "bg-brand-ink text-white")
                }
              >
                {order.refund?.status === "processed"
                  ? "Issue another refund"
                  : order.refund?.status === "pending"
                    ? "Refund processing…"
                    : "Issue refund"}
              </button>
            ) : (
              <div className="text-center text-[11.5px] text-brand-muted">
                {managerRefundUnavailableReason(order)}
              </div>
            )}
          </div>
        </div>
      </div>

      {refundOpen && (
        <ManagerRefundSheet
          shortId={order.shortId}
          maxAmount={order.total}
          onClose={() => setRefundOpen(false)}
          onSubmit={(amount, reason, note) => {
            issueRefund(order.id, amount, reason, note);
            setRefundOpen(false);
          }}
        />
      )}
    </div>
  );
}

function managerRefundEligible(order: Order): boolean {
  return (
    order.status === "cooking" ||
    order.status === "ready" ||
    order.status === "collected"
  );
}

function managerRefundUnavailableReason(order: Order): string {
  if (order.status === "incoming")
    return "Refunds open after the order is accepted.";
  if (order.status === "rejected")
    return order.refundCredit
      ? "Customer received an apology credit on rejection."
      : "Order was rejected — auto-refunded by Billplz.";
  if (order.status === "cancelled")
    return "Cancelled by customer — auto-refunded by Billplz.";
  return "Refund unavailable.";
}

const MANAGER_REFUND_REASONS: import("../../lib/orders").RefundReason[] = [
  "Out of stock",
  "Late",
  "Wrong order",
  "Other",
];

function ManagerRefundSheet({
  shortId,
  maxAmount,
  onClose,
  onSubmit,
}: {
  shortId: string;
  maxAmount: number;
  onClose: () => void;
  onSubmit: (
    amount: number,
    reason: import("../../lib/orders").RefundReason,
    note?: string,
  ) => void;
}) {
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [reason, setReason] =
    useState<import("../../lib/orders").RefundReason>("Out of stock");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0)
      return setError("Enter a positive amount.");
    if (num > maxAmount + 0.001)
      return setError(`Max refund is ${formatRM(maxAmount)}.`);
    onSubmit(Math.round(num * 100) / 100, reason, note.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl w-full sm:max-w-md shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold text-brand-ink">
              Issue refund
            </div>
            <div className="text-[11.5px] text-brand-muted">
              #{shortId} · max {formatRM(maxAmount)}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
              Amount
            </div>
            <div className="flex items-center gap-2 bg-brand-canvas rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-green">
              <span className="text-brand-muted text-[14px] font-semibold">
                RM
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                }
                className="flex-1 bg-transparent text-[15px] tabular-nums focus:outline-none"
              />
              <button
                onClick={() => setAmount(maxAmount.toFixed(2))}
                className="text-brand-green text-[12px] font-bold uppercase tracking-wide"
              >
                Full
              </button>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
              Reason
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MANAGER_REFUND_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={
                    "py-2 rounded-lg text-[13px] font-semibold transition-colors border " +
                    (reason === r
                      ? "bg-brand-ink text-white border-brand-ink"
                      : "bg-white text-brand-ink border-gray-200")
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {reason === "Other" && (
            <div>
              <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
                Detail
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional — what happened?"
                rows={2}
                className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
              />
            </div>
          )}
          {error && <div className="text-red-600 text-[13px]">{error}</div>}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-brand-canvas text-brand-ink rounded-full py-3 font-semibold text-[14px]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 bg-red-600 text-white rounded-full py-3 font-semibold text-[14px]"
          >
            Refund {formatRM(Number(amount) || 0)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                              Stock                                 */
/* ------------------------------------------------------------------ */

function StockScreen() {
  const { state, toggleItem, bringEverythingBack } = useStock();
  const venue = useVenue();
  const disabledItems = state.disabledItemIds.length;
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venue.menu
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((i) =>
          q
            ? `${i.name} ${i.description ?? ""}`.toLowerCase().includes(q)
            : true,
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [query, venue.menu]);

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-5 pt-6 pb-3">
        <div className="text-[12.5px] text-brand-muted">Today's stock</div>
        <div className="text-[24px] font-extrabold text-brand-ink leading-tight">
          Stock
        </div>
      </div>

      <div className="mx-4 bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] text-brand-muted">
            {disabledItems === 0
              ? "Everything's available."
              : `${disabledItems} item${disabledItems === 1 ? "" : "s"} marked sold out.`}
          </div>
          {disabledItems > 0 && (
            <button
              onClick={bringEverythingBack}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-green"
            >
              <RotateIcon className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
        <p className="text-[12px] text-brand-muted leading-relaxed">
          Tap items below to mark them sold out. Customers see them grayed out
          immediately, kitchen tablet syncs in real time.
        </p>
      </div>

      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 bg-white rounded-full px-3.5 py-2 border border-gray-200">
          <SearchIcon className="w-4 h-4 text-brand-muted flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu items"
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
      </div>

      <ManagerStockBody
        state={state}
        toggleItem={toggleItem}
        categories={matches}
        emptyMenu={venue.menu.length === 0}
      />
    </div>
  );
}

function ManagerStockBody({
  state,
  toggleItem,
  categories,
  emptyMenu,
}: {
  state: ReturnType<typeof useStock>["state"];
  toggleItem: (id: string) => void;
  categories: MenuCategory[];
  emptyMenu: boolean;
}) {
  return (
    <div className="mt-3">
      {categories.length === 0 && (
        <div className="px-5 pt-12 text-center text-brand-muted text-[14px]">
          {emptyMenu ? "No menu yet." : "No items match."}
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat.id} className="mt-3">
          <div className="px-5 pb-2 text-[11px] font-extrabold text-brand-muted uppercase tracking-wide">
            {cat.name}
          </div>
          <div className="bg-white border-y border-gray-100">
            {cat.items.map((item) => {
              const disabled = state.disabledItemIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-brand-canvas/60 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className={
                        "text-[14px] font-semibold truncate " +
                        (disabled
                          ? "text-brand-muted line-through"
                          : "text-brand-ink")
                      }
                    >
                      {item.name}
                    </div>
                    <div
                      className={
                        "text-[11px] " +
                        (disabled ? "text-red-500" : "text-brand-muted")
                      }
                    >
                      {disabled ? "Sold out today" : "Available"}
                    </div>
                  </div>
                  <Switch on={!disabled} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={
        "relative inline-block w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 " +
        (on ? "bg-brand-green" : "bg-gray-300")
      }
    >
      <span
        className={
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-4" : "translate-x-0")
        }
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*                            Promotions                              */
/* ------------------------------------------------------------------ */

function PromosScreen() {
  const { promos, togglePromo, removePromo, addPromo, resetToDefaults } =
    usePromos();
  const [creating, setCreating] = useState(false);

  const autoPromos = promos.filter((p) => !p.code);
  const codePromos = promos.filter((p) => !!p.code);

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-5 pt-6 pb-3">
        <div className="text-[12.5px] text-brand-muted">Deals & promo codes</div>
        <div className="text-[24px] font-extrabold text-brand-ink leading-tight">
          Promotions
        </div>
      </div>

      <div className="mx-4 bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[12px] text-brand-muted leading-relaxed">
          Auto-deals run on a schedule and apply at checkout. Promo codes need
          to be entered by the customer.
        </p>
      </div>

      <div className="px-5 pt-5 pb-2 text-[11px] font-extrabold text-brand-muted uppercase tracking-wide">
        Auto deals
      </div>
      <div className="bg-white border-y border-gray-100">
        {autoPromos.length === 0 ? (
          <div className="px-5 py-6 text-[13px] text-brand-muted">
            No auto deals.
          </div>
        ) : (
          autoPromos.map((p) => (
            <PromoRowAdmin
              key={p.id}
              promo={p}
              onToggle={() => togglePromo(p.id)}
              onRemove={() => removePromo(p.id)}
            />
          ))
        )}
      </div>

      <div className="px-5 pt-5 pb-2 text-[11px] font-extrabold text-brand-muted uppercase tracking-wide flex items-center justify-between">
        <span>Promo codes</span>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-green normal-case tracking-normal"
        >
          <PlusIcon className="w-3.5 h-3.5" /> Add code
        </button>
      </div>
      <div className="bg-white border-y border-gray-100">
        {codePromos.length === 0 ? (
          <div className="px-5 py-6 text-[13px] text-brand-muted">
            No promo codes yet.
          </div>
        ) : (
          codePromos.map((p) => (
            <PromoRowAdmin
              key={p.id}
              promo={p}
              onToggle={() => togglePromo(p.id)}
              onRemove={() => removePromo(p.id)}
            />
          ))
        )}
      </div>

      <div className="mt-5 px-5">
        <button
          onClick={resetToDefaults}
          className="text-[12px] text-brand-muted font-semibold inline-flex items-center gap-1.5"
        >
          <RotateIcon className="w-3.5 h-3.5" /> Reset to demo defaults
        </button>
      </div>

      {creating && (
        <NewPromoSheet
          onClose={() => setCreating(false)}
          onCreate={(p) => {
            addPromo(p);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function PromoRowAdmin({
  promo,
  onToggle,
  onRemove,
}: {
  promo: Promo;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const expired = promo.expiry ? Date.now() > promo.expiry : false;
  const valueLabel =
    promo.type === "percent"
      ? `${promo.value}% off`
      : `RM${promo.value} off`;
  return (
    <div className="px-4 py-3 border-b border-gray-50 last:border-b-0 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-semibold text-brand-ink">
            {promo.code ? (
              <span className="font-mono tracking-wide">{promo.code}</span>
            ) : (
              promo.label
            )}
          </div>
          {expired && (
            <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-brand-muted font-bold px-1.5 py-0.5 rounded">
              Expired
            </span>
          )}
        </div>
        <div className="text-[12px] text-brand-muted leading-tight mt-0.5">
          {valueLabel}
          {promo.minSubtotal ? ` · min RM${promo.minSubtotal}` : ""}
          {promo.window ? ` · ${formatWindow(promo.window)}` : ""}
          {promo.expiry && !expired
            ? ` · expires ${new Date(promo.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : ""}
        </div>
      </div>
      <button
        onClick={onToggle}
        aria-label={promo.active ? "Disable promo" : "Enable promo"}
      >
        <Switch on={promo.active} />
      </button>
      {promo.code && (
        <button
          onClick={onRemove}
          aria-label={`Delete ${promo.code}`}
          className="p-1 text-brand-muted"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function NewPromoSheet({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: Omit<Promo, "id">) => void;
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<PromoType>("percent");
  const [value, setValue] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const trimmed = code.trim().toUpperCase();
    const num = Number(value);
    if (!trimmed) return setError("Enter a code.");
    if (!Number.isFinite(num) || num <= 0)
      return setError("Enter a positive amount.");
    if (type === "percent" && num > 100)
      return setError("Percent can't exceed 100.");
    onCreate({
      code: trimmed,
      label: trimmed,
      type,
      value: num,
      minSubtotal: minSubtotal ? Number(minSubtotal) : undefined,
      active: true,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl w-full max-w-[440px] shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="text-[16px] font-bold text-brand-ink">
            New promo code
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
              Code
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME10"
              className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 font-mono tracking-wide text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
              Type
            </div>
            <div className="bg-brand-canvas rounded-lg p-1 flex">
              <button
                onClick={() => setType("percent")}
                className={
                  "flex-1 py-2 rounded-md text-[13px] font-semibold transition-colors " +
                  (type === "percent"
                    ? "bg-white text-brand-ink shadow-sm"
                    : "text-brand-muted")
                }
              >
                Percent off
              </button>
              <button
                onClick={() => setType("flat")}
                className={
                  "flex-1 py-2 rounded-md text-[13px] font-semibold transition-colors " +
                  (type === "flat"
                    ? "bg-white text-brand-ink shadow-sm"
                    : "text-brand-muted")
                }
              >
                Flat RM off
              </button>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
              {type === "percent" ? "Percent" : "Amount (RM)"}
            </div>
            <input
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={type === "percent" ? "10" : "5"}
              className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
              Minimum subtotal (optional)
            </div>
            <input
              inputMode="numeric"
              value={minSubtotal}
              onChange={(e) =>
                setMinSubtotal(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="40"
              className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          {error && <div className="text-red-600 text-[13px]">{error}</div>}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-brand-canvas text-brand-ink rounded-full py-3 font-semibold text-[14px]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 bg-brand-ink text-white rounded-full py-3 font-semibold text-[14px]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                            Settings                                */
/* ------------------------------------------------------------------ */

function SettingsScreen() {
  const { state, setDayHours, setDeliveryMinSubtotal } = useStore();
  const { profile, updateProfile } = useVenueProfile();
  const venue = useVenue();
  const [minDraft, setMinDraft] = useState(
    state.deliveryMinSubtotal.toFixed(2),
  );
  useEffect(() => {
    setMinDraft(state.deliveryMinSubtotal.toFixed(2));
  }, [state.deliveryMinSubtotal]);

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-5 pt-6 pb-3">
        <div className="text-[12.5px] text-brand-muted">Owner profile</div>
        <div className="text-[24px] font-extrabold text-brand-ink leading-tight">
          Settings
        </div>
      </div>

      <div className="px-5 pb-2 text-[11px] font-extrabold text-brand-muted uppercase tracking-wide">
        Business details
      </div>
      <div className="bg-white border-y border-gray-100 divide-y divide-gray-50">
        <ProfileField
          label="Business name"
          value={profile.businessName}
          onChange={(v) => updateProfile({ businessName: v })}
          placeholder={venue.name}
        />
        <ProfileField
          label="SSM number"
          value={profile.ssmNumber}
          onChange={(v) => updateProfile({ ssmNumber: v })}
          placeholder="1234567-A"
        />
        <ProfileField
          label="SST registration"
          subLabel="Optional · leave blank if not registered"
          value={profile.sstRegistrationNumber}
          onChange={(v) => updateProfile({ sstRegistrationNumber: v })}
          placeholder="B23-1234567-12345678"
        />
        <ProfileField
          label="Business address"
          value={profile.address}
          onChange={(v) => updateProfile({ address: v })}
          placeholder="The Campus, Jalan Ampang, 50450 KL"
          multiline
        />
      </div>
      <p className="px-5 pt-2 pb-1 text-[11.5px] text-brand-muted leading-relaxed">
        Used on customer tax receipts. SST line is hidden on receipts when SST
        registration is blank.
      </p>

      <div className="px-5 pt-5 pb-2 text-[11px] font-extrabold text-brand-muted uppercase tracking-wide">
        Operating hours
      </div>
      <div className="bg-white border-y border-gray-100">
        {state.hours.map((day, idx) => (
          <DayHoursRow
            key={idx}
            label={DAY_LABELS[idx]}
            day={day}
            onChange={(next) => setDayHours(idx, next)}
          />
        ))}
      </div>
      <p className="px-5 pt-2 text-[11.5px] text-brand-muted leading-relaxed">
        Customers see "Closed — opens at X" outside these hours. Manual pause
        or "Close for today" in the vendor view still overrides.
      </p>

      <div className="px-5 pt-5 pb-2 text-[11px] font-extrabold text-brand-muted uppercase tracking-wide">
        Delivery
      </div>
      <div className="bg-white border-y border-gray-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-brand-ink">
              Minimum subtotal
            </div>
            <div className="text-[11.5px] text-brand-muted">
              Below this, customers can pickup but not have it delivered. Set 0
              to disable.
            </div>
          </div>
          <div className="flex items-center gap-1 bg-brand-canvas rounded-lg px-2.5 py-1.5 w-28">
            <span className="text-[12px] text-brand-muted">RM</span>
            <input
              inputMode="decimal"
              value={minDraft}
              onChange={(e) =>
                setMinDraft(e.target.value.replace(/[^0-9.]/g, ""))
              }
              onBlur={() => {
                const num = Number(minDraft);
                if (Number.isFinite(num)) setDeliveryMinSubtotal(num);
              }}
              className="flex-1 bg-transparent text-[14px] tabular-nums focus:outline-none w-full min-w-0"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 mx-4 bg-white rounded-2xl border border-gray-100 p-4 text-[12.5px] text-brand-muted leading-relaxed">
        Payouts, staff, integrations — these live here in production. Out of
        scope for this demo.
      </div>
    </div>
  );
}

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function DayHoursRow({
  label,
  day,
  onChange,
}: {
  label: string;
  day: DayHours;
  onChange: (next: DayHours) => void;
}) {
  const open = minutesToInput(day.openMinutes);
  const close = minutesToInput(day.closeMinutes);
  return (
    <div className="px-4 py-3 border-b border-gray-50 last:border-b-0 flex items-center gap-3">
      <div className="w-20 flex-shrink-0">
        <div className="text-[14px] font-semibold text-brand-ink">{label}</div>
      </div>
      {day.closed ? (
        <div className="flex-1 text-[13px] text-brand-muted italic">
          Closed
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-1.5">
          <input
            type="time"
            value={open}
            onChange={(e) =>
              onChange({ ...day, openMinutes: inputToMinutes(e.target.value) })
            }
            className="bg-brand-canvas rounded-md px-2 py-1.5 text-[12.5px] text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green tabular-nums"
          />
          <span className="text-brand-muted text-[12px]">–</span>
          <input
            type="time"
            value={close}
            onChange={(e) =>
              onChange({
                ...day,
                closeMinutes: inputToMinutes(e.target.value),
              })
            }
            className="bg-brand-canvas rounded-md px-2 py-1.5 text-[12.5px] text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green tabular-nums"
          />
        </div>
      )}
      <button
        onClick={() => onChange({ ...day, closed: !day.closed })}
        aria-label={day.closed ? "Open this day" : "Close this day"}
      >
        <Switch on={!day.closed} />
      </button>
    </div>
  );
}

function ProfileField({
  label,
  subLabel,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide">
        {label}
      </div>
      {subLabel && (
        <div className="text-[10.5px] text-brand-muted mb-0.5">{subLabel}</div>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="mt-1 w-full bg-brand-canvas rounded-lg px-3 py-2 text-[13.5px] text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full bg-brand-canvas rounded-lg px-3 py-2 text-[13.5px] text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      )}
    </div>
  );
}

function minutesToInput(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function inputToMinutes(s: string) {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10) || 0);
  return Math.max(0, Math.min(24 * 60, h * 60 + m));
}

/* ------------------------------------------------------------------ */
/*                           Bottom nav                               */
/* ------------------------------------------------------------------ */

function BottomNav({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  // Today's quick action "Push 86 update" emits a custom event we listen to.
  useEffect(() => {
    const onGoto = () => setTab("stock");
    window.addEventListener("manager:goto-stock", onGoto);
    return () => window.removeEventListener("manager:goto-stock", onGoto);
  }, [setTab]);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 grid grid-cols-5">
      <NavBtn
        active={tab === "today"}
        label="Today"
        icon={<TodayIcon />}
        onClick={() => setTab("today")}
      />
      <NavBtn
        active={tab === "history"}
        label="History"
        icon={<HistoryIcon className="w-5 h-5" />}
        onClick={() => setTab("history")}
      />
      <NavBtn
        active={tab === "stock"}
        label="Stock"
        icon={<FlameIcon className="w-5 h-5" />}
        onClick={() => setTab("stock")}
      />
      <NavBtn
        active={tab === "promos"}
        label="Promos"
        icon={<PromoTagIcon />}
        onClick={() => setTab("promos")}
      />
      <NavBtn
        active={tab === "settings"}
        label="Settings"
        icon={<SettingsIcon className="w-5 h-5" />}
        onClick={() => setTab("settings")}
      />
    </div>
  );
}

function PromoTagIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function NavBtn({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "py-2.5 flex flex-col items-center gap-0.5 transition-colors " +
        (active ? "text-brand-ink" : "text-brand-muted")
      }
    >
      {icon}
      <span className="text-[10.5px] font-semibold">{label}</span>
    </button>
  );
}

function TodayIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="16" r="2" />
    </svg>
  );
}
