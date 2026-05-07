import { useEffect, useMemo, useRef, useState } from "react";
import { useOrders } from "../../context/OrdersContext";
import { useStore, type StoreStatus } from "../../context/StoreContext";
import { useVendorNav } from "../../context/VendorNavContext";
import { useSoundEnabled } from "../../components/DemoControls";
import { playIncomingChime, playConfirmTick } from "../../lib/sound";
import {
  BellIcon,
  ChevronDownIcon,
  HistoryIcon,
  PauseIcon,
  StoreIcon,
  FlameIcon,
  CloseIcon,
} from "../../components/icons";
import VendorOrderCard from "./VendorOrderCard";
import PrepTimePickerSheet from "./PrepTimePickerSheet";
import PushBackEtaSheet from "./PushBackEtaSheet";
import RejectModal from "./RejectModal";
import { UndoSnackbar, type UndoToast, newToastId } from "../../components/UndoSnackbar";
import type { Order } from "../../lib/orders";
import { useStock } from "../../context/StockContext";
import { useVenue } from "../../context/VenueContext";

type Tab = "incoming" | "cooking" | "ready";

export default function VendorMainScreen() {
  const {
    orders,
    acceptOrder,
    markReady,
    markCollected,
    rejectOrder,
    pushBackEta,
    restoreOrder,
  } = useOrders();
  const { state: storeState } = useStore();
  const { go } = useVendorNav();
  const { toggleItem } = useStock();
  const [sound] = useSoundEnabled();

  const [activeTab, setActiveTab] = useState<Tab>("incoming");
  const [acceptingFor, setAcceptingFor] = useState<Order | null>(null);
  const [rejectingFor, setRejectingFor] = useState<Order | null>(null);
  const [pushBackFor, setPushBackFor] = useState<Order | null>(null);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const [collectedCardsHidden, setCollectedCardsHidden] = useState<Set<string>>(
    new Set(),
  );

  const [cancelledFlashIds, setCancelledFlashIds] = useState<Set<string>>(
    new Set(),
  );

  // Filter to "today's incoming/cooking/ready" — past collected/rejected go to history
  const incoming = orders.filter(
    (o) =>
      o.status === "incoming" ||
      (o.status === "cancelled" && cancelledFlashIds.has(o.id)),
  );
  const cooking = orders.filter((o) => o.status === "cooking");
  const ready = orders.filter(
    (o) => o.status === "ready" || (o.status === "collected" && !collectedCardsHidden.has(o.id)),
  );

  // Today's snapshot
  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const todaysOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.placedAt >= todayMidnight &&
          o.status !== "rejected" &&
          o.status !== "cancelled",
      ),
    [orders, todayMidnight],
  );

  // Detect new incoming orders → chime + flash
  const seenIdsRef = useRef<Set<string>>(new Set(orders.map((o) => o.id)));
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  // Track when an order transitions to "cancelled" so we can flash it red briefly
  const prevStatusRef = useRef<Map<string, string>>(
    new Map(orders.map((o) => [o.id, o.status])),
  );
  useEffect(() => {
    const newCancellations: string[] = [];
    for (const o of orders) {
      const prev = prevStatusRef.current.get(o.id);
      if (o.status === "cancelled" && prev && prev !== "cancelled") {
        newCancellations.push(o.id);
      }
      prevStatusRef.current.set(o.id, o.status);
    }
    if (newCancellations.length === 0) return;
    setCancelledFlashIds((s) => {
      const next = new Set(s);
      for (const id of newCancellations) next.add(id);
      return next;
    });
    const t = setTimeout(() => {
      setCancelledFlashIds((s) => {
        const next = new Set(s);
        for (const id of newCancellations) next.delete(id);
        return next;
      });
    }, 3000);
    return () => clearTimeout(t);
  }, [orders]);

  useEffect(() => {
    const seen = seenIdsRef.current;
    const newIds: string[] = [];
    for (const o of orders) {
      if (o.status === "incoming" && !seen.has(o.id)) newIds.push(o.id);
      seen.add(o.id);
    }
    if (newIds.length === 0) return;
    if (sound) playIncomingChime();
    setFreshIds((prev) => new Set([...prev, ...newIds]));
    const t = setTimeout(() => {
      setFreshIds(new Set());
    }, 1100);
    return () => clearTimeout(t);
  }, [orders, sound]);

  // Auto-hide collected cards 10s after they collect
  useEffect(() => {
    const collectedNotHidden = orders.filter(
      (o) => o.status === "collected" && !collectedCardsHidden.has(o.id) && o.collectedAt,
    );
    if (collectedNotHidden.length === 0) return;
    const timeouts = collectedNotHidden.map((o) => {
      const remaining = Math.max(0, 10_000 - (Date.now() - (o.collectedAt ?? 0)));
      return setTimeout(() => {
        setCollectedCardsHidden((prev) => new Set([...prev, o.id]));
      }, remaining);
    });
    return () => timeouts.forEach(clearTimeout);
  }, [orders, collectedCardsHidden]);

  // -------- Action handlers with undo --------
  const onAccept = (order: Order, prepMinutes: number) => {
    const before = { ...order };
    acceptOrder(order.id, prepMinutes);
    if (sound) playConfirmTick();
    setToast({
      id: newToastId(),
      message: `Accepted #${order.shortId} · ~${prepMinutes} min`,
      onUndo: () => restoreOrder(before),
    });
  };

  const onMarkReady = (order: Order) => {
    const before = { ...order };
    markReady(order.id);
    if (sound) playConfirmTick();
    setToast({
      id: newToastId(),
      message: `#${order.shortId} marked ready`,
      onUndo: () => restoreOrder(before),
    });
  };

  const onCollected = (order: Order) => {
    const before = { ...order };
    markCollected(order.id);
    if (sound) playConfirmTick();
    setToast({
      id: newToastId(),
      message:
        order.fulfillment === "delivery"
          ? `Driver collected #${order.shortId}`
          : `#${order.shortId} picked up`,
      onUndo: () => restoreOrder(before),
    });
  };

  const onPushBack = (order: Order, addMinutes: number) => {
    const before = { ...order };
    pushBackEta(order.id, addMinutes);
    if (sound) playConfirmTick();
    setToast({
      id: newToastId(),
      message: `#${order.shortId} pushed back +${addMinutes} min`,
      onUndo: () => restoreOrder(before),
    });
  };

  const onReject = (
    order: Order,
    reason: string,
    itemId?: string,
    refundCredit?: number,
  ) => {
    const before = { ...order };
    rejectOrder(order.id, reason, itemId, refundCredit);
    if (reason === "Out of stock" && itemId) toggleItem(itemId);
    setRejectingFor(null);
    setToast({
      id: newToastId(),
      message: `#${order.shortId} rejected · refund processed`,
      onUndo: () => {
        restoreOrder(before);
        if (reason === "Out of stock" && itemId) toggleItem(itemId);
      },
    });
  };

  return (
    <div className="relative flex-1 flex flex-col bg-[#fafafa] overflow-hidden">
      <Header storeState={storeState} />
      <SnapshotBanner
        ordersCount={todaysOrders.length}
        cookingCount={cooking.length}
        readyCount={ready.filter((o) => o.status === "ready").length}
        storeStatus={storeState}
      />

      {/* Mobile tab bar (single column on phones) */}
      <div className="lg:hidden border-b border-gray-200 bg-white">
        <div className="flex">
          <TabButton
            label="Incoming"
            count={incoming.length}
            active={activeTab === "incoming"}
            onClick={() => setActiveTab("incoming")}
            accent="text-brand-green"
          />
          <TabButton
            label="Cooking"
            count={cooking.length}
            active={activeTab === "cooking"}
            onClick={() => setActiveTab("cooking")}
            accent="text-amber-600"
          />
          <TabButton
            label="Ready"
            count={ready.length}
            active={activeTab === "ready"}
            onClick={() => setActiveTab("ready")}
            accent="text-blue-600"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {/* Tablet 3-column kanban */}
        <div className="hidden lg:grid grid-cols-3 gap-4 p-4 h-full overflow-hidden">
          <Column
            label="INCOMING"
            count={incoming.length}
            tone="text-brand-green"
            empty="No incoming orders. Sit tight 🤝"
          >
            {incoming.map((o) => (
              <VendorOrderCard
                key={o.id}
                order={o}
                isFresh={freshIds.has(o.id)}
                primaryAction={() => setAcceptingFor(o)}
                primaryLabel={`Accept`}
                secondaryAction={() => setRejectingFor(o)}
              />
            ))}
          </Column>
          <Column
            label="COOKING"
            count={cooking.length}
            tone="text-amber-600"
            empty="Nothing on the fryers."
          >
            {cooking.map((o) => (
              <VendorOrderCard
                key={o.id}
                order={o}
                showDriver={o.fulfillment === "delivery"}
                primaryAction={() => onMarkReady(o)}
                primaryLabel="Mark ready"
                menuItems={[
                  { label: "Push back ETA", onClick: () => setPushBackFor(o) },
                ]}
              />
            ))}
          </Column>
          <Column
            label="READY"
            count={ready.length}
            tone="text-blue-600"
            empty="All caught up."
          >
            {ready.map((o) => (
              <VendorOrderCard
                key={o.id}
                order={o}
                showDriver={o.fulfillment === "delivery"}
                primaryAction={
                  o.status === "ready" ? () => onCollected(o) : undefined
                }
                primaryLabel={
                  o.fulfillment === "delivery"
                    ? "Driver collected"
                    : "Customer arrived"
                }
                rightAccessory={
                  o.status === "collected" ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-green/15 text-brand-green px-1.5 py-0.5 rounded">
                      Done
                    </span>
                  ) : null
                }
              />
            ))}
          </Column>
        </div>

        {/* Phone single-column view */}
        <div className="lg:hidden h-full overflow-y-auto p-3 space-y-3">
          {activeTab === "incoming" &&
            (incoming.length === 0 ? (
              <Empty>No incoming orders.</Empty>
            ) : (
              incoming.map((o) => (
                <VendorOrderCard
                  key={o.id}
                  order={o}
                  isFresh={freshIds.has(o.id)}
                  primaryAction={() => setAcceptingFor(o)}
                  primaryLabel="Accept"
                  secondaryAction={() => setRejectingFor(o)}
                />
              ))
            ))}
          {activeTab === "cooking" &&
            (cooking.length === 0 ? (
              <Empty>Nothing on the fryers.</Empty>
            ) : (
              cooking.map((o) => (
                <VendorOrderCard
                  key={o.id}
                  order={o}
                  showDriver={o.fulfillment === "delivery"}
                  primaryAction={() => onMarkReady(o)}
                  primaryLabel="Mark ready"
                  menuItems={[
                    {
                      label: "Push back ETA",
                      onClick: () => setPushBackFor(o),
                    },
                  ]}
                />
              ))
            ))}
          {activeTab === "ready" &&
            (ready.length === 0 ? (
              <Empty>All caught up.</Empty>
            ) : (
              ready.map((o) => (
                <VendorOrderCard
                  key={o.id}
                  order={o}
                  showDriver={o.fulfillment === "delivery"}
                  primaryAction={
                    o.status === "ready" ? () => onCollected(o) : undefined
                  }
                  primaryLabel={
                    o.fulfillment === "delivery"
                      ? "Driver collected"
                      : "Customer arrived"
                  }
                />
              ))
            ))}
        </div>
      </div>

      {/* Bottom rail (tablet) */}
      <div className="hidden lg:flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-white">
        <div className="text-[11.5px] text-brand-muted">
          Tip: orders sync between this tablet and the phone in real-time.
        </div>
        <div className="flex items-center gap-2">
          <RailButton onClick={() => go({ name: "stock" })} icon={<FlameIcon className="w-4 h-4" />}>
            Stock
          </RailButton>
          <RailButton onClick={() => go({ name: "history" })} icon={<HistoryIcon className="w-4 h-4" />}>
            History
          </RailButton>
        </div>
      </div>

      {/* Phone bottom action rail */}
      <div className="lg:hidden flex border-t border-gray-200 bg-white">
        <button
          onClick={() => go({ name: "stock" })}
          className="flex-1 py-3 text-[12.5px] font-semibold text-brand-ink flex items-center justify-center gap-1.5"
        >
          <FlameIcon className="w-4 h-4" /> Stock
        </button>
        <div className="w-px bg-gray-200" />
        <button
          onClick={() => go({ name: "history" })}
          className="flex-1 py-3 text-[12.5px] font-semibold text-brand-ink flex items-center justify-center gap-1.5"
        >
          <HistoryIcon className="w-4 h-4" /> History
        </button>
      </div>

      {/* Modals */}
      {acceptingFor && (
        <PrepTimePickerSheet
          orderShortId={acceptingFor.shortId}
          onCancel={() => setAcceptingFor(null)}
          onPick={(min) => {
            onAccept(acceptingFor, min);
            setAcceptingFor(null);
          }}
        />
      )}
      {rejectingFor && (
        <RejectModal
          order={rejectingFor}
          onCancel={() => setRejectingFor(null)}
          onConfirm={(reason, itemId, credit) =>
            onReject(rejectingFor, reason, itemId, credit)
          }
        />
      )}
      {pushBackFor && (
        <PushBackEtaSheet
          orderShortId={pushBackFor.shortId}
          currentPrepMinutes={pushBackFor.prepMinutes ?? 25}
          onCancel={() => setPushBackFor(null)}
          onPick={(addMin) => {
            onPushBack(pushBackFor, addMin);
            setPushBackFor(null);
          }}
        />
      )}

      {toast && (
        <UndoSnackbar
          key={toast.id}
          toast={toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                              Header                                */
/* ------------------------------------------------------------------ */

function Header({ storeState }: { storeState: ReturnType<typeof useStore>["state"] }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const { isOutsideHours } = useStore();
  const venue = useVenue();
  const offHours =
    isOutsideHours &&
    !storeState.closingToday &&
    storeState.status === "open";
  const monogram = venue.orderIdPrefix.slice(0, 2).toUpperCase();
  const venueLocality = venue.address.split(",").slice(0, 2).join(",").trim();
  return (
    <div className="bg-white border-b border-gray-200 px-4 lg:px-5 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-ink text-white flex items-center justify-center font-extrabold">
        {monogram}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-bold text-brand-ink leading-tight truncate">
          {venue.name} · Vendor
        </div>
        <div className="text-[11.5px] text-brand-muted truncate">
          {venueLocality}
        </div>
      </div>
      <button
        onClick={() => setStatusOpen(true)}
        className={
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-bold border transition-colors " +
          statusChipClass(storeState.status, storeState.closingToday, offHours)
        }
      >
        <span
          className={
            "w-1.5 h-1.5 rounded-full " +
            (offHours
              ? "bg-gray-500"
              : storeState.closingToday
              ? "bg-gray-700"
              : storeState.status === "open"
              ? "bg-green-500"
              : storeState.status === "busy"
              ? "bg-amber-500"
              : "bg-red-500")
          }
        />
        {offHours ? "Off hours" : storeChipLabel(storeState)}
        <ChevronDownIcon className="w-3.5 h-3.5 opacity-70" />
      </button>
      {statusOpen && <StoreStatusSheet onClose={() => setStatusOpen(false)} />}
    </div>
  );
}

function statusChipClass(
  status: StoreStatus,
  closingToday: boolean,
  offHours: boolean,
) {
  if (offHours) return "bg-gray-100 text-gray-800 border-gray-200";
  if (closingToday) return "bg-gray-100 text-gray-800 border-gray-200";
  if (status === "open") return "bg-green-50 text-green-800 border-green-200";
  if (status === "busy") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-red-50 text-red-800 border-red-200";
}

function storeChipLabel(s: ReturnType<typeof useStore>["state"]) {
  if (s.closingToday) return "Closing today";
  if (s.status === "open") return "Open";
  if (s.status === "busy") return `Busy +${s.busyExtraMinutes}m`;
  if (!s.pausedUntil) return "Paused";
  const left = Math.max(0, s.pausedUntil - Date.now());
  const min = Math.ceil(left / 60_000);
  return min > 0 ? `Paused · ${min}m` : "Paused";
}

function StoreStatusSheet({ onClose }: { onClose: () => void }) {
  const {
    state,
    setOpen,
    setBusy,
    setPaused,
    setClosingToday,
    setKitchenPrepMinutes,
  } = useStore();
  const [section, setSection] = useState<"open" | "busy" | "paused" | "closing">(
    state.closingToday
      ? "closing"
      : state.status === "open"
      ? "open"
      : state.status === "busy"
      ? "busy"
      : "paused",
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 pb-7 shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[20px] font-bold text-brand-ink">Store status</div>
            <div className="text-[12.5px] text-brand-muted mt-0.5">
              Customers see this on the menu and at checkout.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 -mt-1"
          >
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>

        <div className="space-y-2">
          <StatusOption
            color="green"
            icon={<StoreIcon className="w-5 h-5" />}
            label="Open"
            sub="Accepting orders normally"
            active={section === "open"}
            onClick={() => {
              setOpen();
              setSection("open");
              onClose();
            }}
          />

          <StatusOption
            color="amber"
            icon={<BellIcon className="w-5 h-5" />}
            label="Busy"
            sub="Accepting orders, longer ETA"
            active={section === "busy"}
            onClick={() => setSection("busy")}
            expand={
              section === "busy" && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[10, 20, 30].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setBusy(m);
                        onClose();
                      }}
                      className={
                        "rounded-lg py-2.5 text-[13px] font-bold border " +
                        (state.status === "busy" && state.busyExtraMinutes === m
                          ? "border-amber-500 bg-amber-50 text-amber-900"
                          : "border-gray-200 text-brand-ink")
                      }
                    >
                      +{m}m
                    </button>
                  ))}
                  <CustomBusy onSet={(m) => { setBusy(m); onClose(); }} />
                </div>
              )
            }
          />

          <StatusOption
            color="red"
            icon={<PauseIcon className="w-5 h-5" />}
            label="Paused"
            sub="Not accepting new orders"
            active={section === "paused"}
            onClick={() => setSection("paused")}
            expand={
              section === "paused" && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[15, 30, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setPaused(m);
                        onClose();
                      }}
                      className="rounded-lg py-2.5 text-[13px] font-bold border border-gray-200 text-brand-ink"
                    >
                      {m}m
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setPaused(null);
                      onClose();
                    }}
                    className="rounded-lg py-2.5 text-[12px] font-bold border border-gray-200 text-brand-ink"
                  >
                    Until I reopen
                  </button>
                </div>
              )
            }
          />
        </div>

        <button
          onClick={() => {
            setClosingToday(!state.closingToday);
            onClose();
          }}
          className={
            "mt-4 w-full rounded-xl py-3 text-[13.5px] font-semibold border " +
            (state.closingToday
              ? "bg-brand-ink text-white border-brand-ink"
              : "bg-white text-brand-ink border-gray-200")
          }
        >
          {state.closingToday ? "✓ Closing today" : "Close for the rest of today"}
        </button>
        <p className="text-[11.5px] text-brand-muted mt-2 leading-snug">
          Closing today stops new orders for the day without changing tomorrow's
          hours.
        </p>

        <div className="mt-5 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[13.5px] font-bold text-brand-ink">
                Kitchen prep default
              </div>
              <div className="text-[11.5px] text-brand-muted leading-tight">
                Customer's checkout ETA · per-order prep set on Accept.
              </div>
            </div>
            <div className="text-[18px] font-extrabold text-brand-ink tabular-nums">
              {state.kitchenPrepMinutes}{" "}
              <span className="text-[11px] text-brand-muted font-semibold">
                min
              </span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[15, 20, 25, 35, 45].map((m) => (
              <button
                key={m}
                onClick={() => setKitchenPrepMinutes(m)}
                className={
                  "rounded-lg py-2 text-[12.5px] font-semibold border transition-colors " +
                  (state.kitchenPrepMinutes === m
                    ? "bg-brand-ink text-white border-brand-ink"
                    : "bg-white text-brand-ink border-gray-200")
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomBusy({ onSet }: { onSet: (m: number) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="col-span-1 flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Custom"
        type="number"
        inputMode="numeric"
        className="w-full text-[12px] focus:outline-none"
      />
      <button
        disabled={!v}
        onClick={() => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n > 0) onSet(n);
        }}
        className={
          "text-[11px] font-bold " +
          (v ? "text-amber-700" : "text-gray-300")
        }
      >
        ✓
      </button>
    </div>
  );
}

function StatusOption({
  color,
  label,
  sub,
  icon,
  active,
  onClick,
  expand,
}: {
  color: "green" | "amber" | "red";
  label: string;
  sub: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  expand?: React.ReactNode;
}) {
  const ringClass =
    color === "green"
      ? "border-green-300 bg-green-50/50"
      : color === "amber"
      ? "border-amber-300 bg-amber-50/50"
      : "border-red-300 bg-red-50/50";
  const dotClass =
    color === "green"
      ? "bg-green-500"
      : color === "amber"
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div
      className={
        "rounded-xl border transition-colors " +
        (active ? ringClass : "border-gray-200")
      }
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <span
          className={
            "w-9 h-9 rounded-full flex items-center justify-center text-white " +
            dotClass
          }
        >
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-[14.5px] font-bold text-brand-ink">
            {label}
          </span>
          <span className="block text-[12px] text-brand-muted">{sub}</span>
        </span>
        {active && (
          <span className="text-[11px] font-bold uppercase tracking-wide text-brand-ink/60">
            Selected
          </span>
        )}
      </button>
      {expand && <div className="px-3 pb-3">{expand}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                          Snapshot banner                           */
/* ------------------------------------------------------------------ */

function SnapshotBanner({
  ordersCount,
  cookingCount,
  readyCount,
  storeStatus,
}: {
  ordersCount: number;
  cookingCount: number;
  readyCount: number;
  storeStatus: ReturnType<typeof useStore>["state"];
}) {
  // Operational only — revenue lives on the manager phone.
  return (
    <div className="bg-gradient-to-r from-brand-ink via-brand-ink to-[#1a1a1a] text-white px-4 lg:px-5 py-2.5 flex items-center gap-4">
      <Stat label="Today" value={`${ordersCount} orders`} />
      <Divider />
      <Stat
        label="Pending"
        value={`${cookingCount} cooking · ${readyCount} ready`}
      />
      <Divider />
      <Stat label="Store" value={storeChipLabel(storeStatus)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-white/50 uppercase tracking-wide leading-none">
        {label}
      </div>
      <div className="text-[13.5px] font-bold leading-tight truncate">
        {value}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="w-px h-7 bg-white/15" />;
}

/* ------------------------------------------------------------------ */
/*                              Tabs                                  */
/* ------------------------------------------------------------------ */

function TabButton({
  label,
  count,
  active,
  onClick,
  accent,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 py-3 text-[13px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors " +
        (active
          ? `${accent} border-current`
          : "text-brand-muted border-transparent")
      }
    >
      {label}
      <span
        className={
          "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold " +
          (active ? "bg-current text-white" : "bg-gray-100 text-brand-muted")
        }
        style={active ? { mixBlendMode: "normal" } : undefined}
      >
        {count}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*                            Column / empty                          */
/* ------------------------------------------------------------------ */

function Column({
  label,
  count,
  tone,
  empty,
  children,
}: {
  label: string;
  count: number;
  tone: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-[#f3f3f3] overflow-hidden border border-gray-200">
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-200 bg-white">
        <div className={"text-[12px] font-extrabold uppercase tracking-wide " + tone}>
          {label}
        </div>
        <div
          className={
            "px-2 min-w-6 h-6 rounded-full text-[12px] font-bold flex items-center justify-center " +
            (count === 0
              ? "bg-gray-100 text-brand-muted"
              : "bg-brand-ink text-white")
          }
        >
          {count}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {count === 0 ? <Empty>{empty}</Empty> : children}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-[28px] mb-1 opacity-30">○</div>
      <div className="text-[13px] text-brand-muted">{children}</div>
    </div>
  );
}

function RailButton({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-brand-canvas hover:bg-gray-200 text-[12.5px] font-semibold text-brand-ink"
    >
      {icon}
      {children}
    </button>
  );
}
