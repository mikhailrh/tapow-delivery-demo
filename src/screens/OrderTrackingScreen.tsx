import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useNav } from "../context/NavContext";
import { useOrders } from "../context/OrdersContext";
import { useStore } from "../context/StoreContext";
import { useVenue } from "../context/VenueContext";
import { formatRM } from "../lib/money";
import {
  calculateOrderCustomerEta,
  lifecycleLabel,
  type LifecycleLine,
  type Order,
} from "../lib/orders";
import { calculateSavings } from "../lib/pricing";
import {
  BackIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MessageIcon,
  MotorbikeIcon,
} from "../components/icons";
import OrderReceiptContent from "../components/OrderReceiptContent";

/**
 * The single-order tracking surface — the primary post-payment landing.
 * Tapow-styled (not WhatsApp chrome). Sections vertically stacked:
 * lifecycle status + progress strip → ETA card → rider card (delivery only)
 * → merchant block with "Chat with [restaurant]" row → payment + savings →
 * "View order summary" expandable → "Receipt sent to your WhatsApp" line →
 * "Back to WhatsApp" demo-flow button.
 *
 * The two-way chat lives in a SEPARATE surface
 * ([OrderChatScreen.tsx](src/screens/OrderChatScreen.tsx)), opened from the
 * merchant block's row. The WhatsApp notification rail
 * ([WhatsAppScreen.tsx](src/screens/WhatsAppScreen.tsx)) is reached via the
 * "Back to WhatsApp" CTA below — a demo-flow device for replaying the
 * notification round-trip; production re-entry is via the WA notification
 * itself, not an in-app button.
 */
export default function OrderTrackingScreen({ orderId }: { orderId: string }) {
  const { go } = useNav();
  const { clear } = useCart();
  const { getById } = useOrders();
  const { state: storeState } = useStore();
  const venue = useVenue();
  const stable = getById(orderId);

  if (!stable) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-white">
        <p className="text-[15px] text-brand-muted">No order to display.</p>
        <button
          onClick={() => go({ name: "menu" })}
          className="mt-4 bg-brand-green hover:bg-brand-greenDeep active:bg-brand-greenDeep text-white rounded-full px-5 py-2.5 font-semibold text-[14px] transition-colors"
        >
          Back to menu
        </button>
      </div>
    );
  }

  const startOver = () => {
    clear();
    go({ name: "menu" });
  };

  const totalEta = calculateOrderCustomerEta(
    stable,
    storeState.kitchenPrepMinutes,
  );

  const savings = calculateSavings(
    stable.subtotal,
    stable.deliveryFee,
    stable.serviceCharge + stable.sst,
  );

  const monogram = venue.orderIdPrefix.slice(0, 2).toUpperCase();

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={startOver}
          aria-label="Done — back to menu"
          className="p-1 -ml-1 text-brand-ink"
        >
          <BackIcon className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-brand-ink leading-tight truncate">
            Order #{stable.shortId}
          </div>
          <div className="text-[11.5px] text-brand-muted leading-tight capitalize">
            {stable.fulfillment} · {venue.name}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-brand-ink text-white text-[11px] font-extrabold flex items-center justify-center">
          {monogram}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ProgressSection order={stable} />
        {!isTerminal(stable) && (
          <EtaCard order={stable} totalEta={totalEta} />
        )}
        {stable.fulfillment === "delivery" &&
          stable.driver &&
          (stable.status === "ready" || stable.status === "cooking") && (
            <RiderCard order={stable} />
          )}
        <MerchantBlock
          venueName={venue.name}
          venueAddress={venue.address}
          onChat={() => go({ name: "orderChat", orderId: stable.id })}
        />
        <PaymentSavings order={stable} savings={savings} />
        <OrderSummaryExpandable order={stable} />
        <ReceiptOnWhatsAppLine />
        <BackToWhatsAppButton
          onClick={() => go({ name: "whatsapp", orderId: stable.id })}
        />
      </div>
    </div>
  );
}

function isTerminal(order: Order): boolean {
  return order.status === "rejected" || order.status === "cancelled";
}

function ProgressSection({ order }: { order: Order }) {
  const line: LifecycleLine = lifecycleLabel(order);
  const isTerm = line.tone === "terminal";
  const isSettled = line.tone === "settled";

  const headerDotClass = isTerm
    ? "bg-red-500"
    : isSettled
      ? "bg-brand-muted"
      : "bg-brand-green";
  const headerLabelClass = isTerm ? "text-red-700" : "text-brand-ink";

  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={
            "w-2.5 h-2.5 rounded-full flex-shrink-0 " +
            headerDotClass +
            (line.tone === "active" ? " animate-pulse" : "")
          }
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className={"text-[16px] font-extrabold leading-tight " + headerLabelClass}>
            {line.label}
          </div>
          {line.subLabel && (
            <div className="text-[12px] text-brand-muted leading-tight mt-0.5">
              {line.subLabel}
            </div>
          )}
        </div>
      </div>
      {!isTerm && <ProgressStrip order={order} />}
    </div>
  );
}

function ProgressStrip({ order }: { order: Order }) {
  const isDelivery = order.fulfillment === "delivery";
  const steps = isDelivery
    ? [
        { label: "Placed", at: order.placedAt },
        { label: "Cooking", at: order.acceptedAt },
        { label: "Out", at: order.readyAt },
        { label: "Delivered", at: order.collectedAt },
      ]
    : [
        { label: "Placed", at: order.placedAt },
        { label: "Cooking", at: order.acceptedAt },
        { label: "Ready", at: order.readyAt },
        { label: "Picked up", at: order.collectedAt },
      ];
  // The first step without an `at` is the currently-active one. -1 means
  // every step has happened → render every step as done.
  const pendingIdx = steps.findIndex((s) => !s.at);
  const allDone = pendingIdx === -1;

  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => {
        const state: StepState = allDone
          ? "done"
          : i < pendingIdx
            ? "done"
            : i === pendingIdx
              ? "active"
              : "future";
        return (
          <div key={i} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center w-full">
              <StepDot state={state} />
              <div
                className={
                  "text-[10.5px] mt-1.5 text-center leading-tight w-full px-0.5 " +
                  (state === "future" ? "text-brand-muted" : "text-brand-ink")
                }
              >
                {step.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-shrink-0 self-start mt-3 h-0.5 w-4 sm:w-6 bg-gray-200 relative overflow-hidden">
                <div
                  className={
                    "absolute inset-0 transition-all duration-300 " +
                    (allDone || i < pendingIdx
                      ? "bg-brand-green w-full"
                      : "w-0")
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type StepState = "done" | "active" | "future";

function StepDot({ state }: { state: StepState }) {
  const cls =
    state === "done"
      ? "bg-brand-green text-white"
      : state === "active"
        ? "bg-brand-green text-white animate-pulse"
        : "bg-gray-200 text-gray-400";
  return (
    <div
      className={
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 " +
        cls
      }
    >
      {state === "done" && <CheckIcon className="w-4 h-4" strokeWidth={3} />}
      {state === "active" && (
        <span className="w-2 h-2 rounded-full bg-white" aria-hidden />
      )}
    </div>
  );
}

function EtaCard({ order, totalEta }: { order: Order; totalEta: number }) {
  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="bg-brand-green/10 border border-brand-green/30 rounded-xl px-4 py-3.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-green">
          ETA
        </div>
        <div className="text-[22px] font-extrabold text-brand-ink leading-tight mt-0.5">
          {order.fulfillment === "delivery"
            ? `~${totalEta} min to your door`
            : `~${totalEta} min for pickup`}
        </div>
      </div>
    </div>
  );
}

function RiderCard({ order }: { order: Order }) {
  if (!order.driver) return null;
  const partner = "Lalamove";
  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-muted mb-2">
        Rider
      </div>
      <div className="bg-brand-canvas rounded-xl px-3.5 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-ink text-white text-[13px] font-extrabold flex items-center justify-center flex-shrink-0">
          {order.driver.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-brand-ink truncate">
            {order.driver.name}
          </div>
          <div className="text-[11.5px] text-brand-muted truncate">
            <MotorbikeIcon className="w-3 h-3 inline -mt-0.5 mr-1" />
            {order.status === "ready"
              ? `Arriving in ~${order.driver.etaMinutes} min`
              : `Assigned · ~${order.driver.etaMinutes} min away`}
          </div>
        </div>
        <button
          type="button"
          // Inert on purpose — the partner tracking link is the production-
          // correct surface for live rider tracking. Wire to the actual
          // Lalamove/Delyva tracking URL once dispatch integration lands.
          // We don't run a built-in map or in-app rider chat; the rider is
          // a separate party we don't control.
          aria-disabled="true"
          className="flex-shrink-0 inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-[12px] font-semibold text-brand-ink"
        >
          Track on {partner} ↗
        </button>
      </div>
    </div>
  );
}

function MerchantBlock({
  venueName,
  venueAddress,
  onChat,
}: {
  venueName: string;
  venueAddress: string;
  onChat: () => void;
}) {
  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-muted mb-2">
        Restaurant
      </div>
      <div className="text-[15px] font-bold text-brand-ink leading-tight">
        {venueName}
      </div>
      <div className="text-[12px] text-brand-muted leading-snug mt-0.5">
        {venueAddress}
      </div>
      <button
        onClick={onChat}
        className="mt-3 w-full flex items-center gap-3 bg-brand-canvas hover:bg-gray-200 transition-colors rounded-xl px-3.5 py-3 text-left"
      >
        <span className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
          <MessageIcon className="w-4 h-4 text-brand-ink" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-bold text-brand-ink leading-tight">
            Chat with {venueName}
          </span>
          <span className="block text-[11.5px] text-brand-muted leading-tight mt-0.5">
            Sub items, send photos, leave a review
          </span>
        </span>
        <ChevronRightIcon className="w-4 h-4 text-brand-muted flex-shrink-0" />
      </button>
    </div>
  );
}

function PaymentSavings({
  order,
  savings,
}: {
  order: Order;
  savings: number;
}) {
  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-muted mb-2">
        Payment
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold text-brand-ink">
          Card •••• 4242
        </div>
        <div className="text-[13px] font-bold text-brand-ink tabular-nums">
          {formatRM(order.total)}
        </div>
      </div>
      <div className="text-[11.5px] text-emerald-700 font-semibold mt-1">
        You saved {formatRM(savings)} vs the big delivery apps today
      </div>
    </div>
  );
}

function OrderSummaryExpandable({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 py-1"
        aria-expanded={open}
      >
        <span className="text-[13.5px] font-bold text-brand-ink">
          View order summary
        </span>
        <ChevronDownIcon
          className={
            "w-5 h-5 text-brand-muted transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>
      {open && (
        <div className="mt-3 space-y-3" style={{ animation: "fadeIn 0.16s ease-out" }}>
          <OrderReceiptContent order={order} />
          {order.address && (
            <div className="text-[12.5px] text-brand-muted leading-snug">
              <span className="font-bold text-brand-ink">Deliver to: </span>
              {order.address}
            </div>
          )}
          <div className="text-[12px] text-brand-muted">
            Order ref · #{order.shortId}
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptOnWhatsAppLine() {
  return (
    <div className="px-4 py-3 flex items-center gap-2 bg-emerald-50 border-b border-emerald-100">
      <span className="text-emerald-700 text-[12px] font-bold">✓</span>
      <span className="text-[12px] text-emerald-900 leading-tight">
        Receipt sent to your WhatsApp.
      </span>
    </div>
  );
}

function BackToWhatsAppButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="px-4 py-5">
      <button
        // Demo-flow device — in production the customer re-enters this surface
        // via a WhatsApp notification, not an in-app button. Kept here so the
        // demo can replay the notification round-trip on demand.
        onClick={onClick}
        className="w-full bg-brand-ink text-white rounded-full py-3.5 text-[14px] font-bold"
      >
        Back to WhatsApp
      </button>
    </div>
  );
}
