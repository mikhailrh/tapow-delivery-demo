import { useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { useNav } from "../context/NavContext";
import { useOrders } from "../context/OrdersContext";
import { useStore } from "../context/StoreContext";
import { usePromos } from "../context/PromoContext";
import { useVenue } from "../context/VenueContext";
import {
  useCustomerProfile,
  type SavedAddress,
} from "../context/CustomerProfileContext";
import { calculateCustomerEta, snapshotLines } from "../lib/orders";
import {
  DELIVERY_FEE,
  SERVICE_CHARGE_RATE,
  SST_RATE,
  formatRM,
} from "../lib/money";
import {
  BackIcon,
  PinIcon,
  ClockIcon,
  CardIcon,
  ChevronRightIcon,
  CloseIcon,
  PlusIcon,
} from "../components/icons";

export default function CheckoutScreen() {
  const { back, go } = useNav();
  const { lines, note, subtotal, promoCode } = useCart();
  const { createOrder } = useOrders();
  const {
    state: storeState,
    busyDelta,
    isAcceptingOrders,
    isOutsideHours,
    nextOpenLabel,
  } = useStore();
  const { promos, bestAutoFor, computeDiscount } = usePromos();
  const { profile, selectedAddress, selectAddress, addAddress } =
    useCustomerProfile();
  const venue = useVenue();
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  const codeMatch = useMemo(
    () =>
      promoCode
        ? promos.find(
            (p) => (p.code ?? "").toUpperCase() === promoCode.toUpperCase(),
          ) ?? null
        : null,
    [promoCode, promos],
  );
  const autoPromo = useMemo(
    () => (codeMatch ? null : bestAutoFor(subtotal)),
    [codeMatch, bestAutoFor, subtotal],
  );
  const activePromo = codeMatch ?? autoPromo;
  const discount = activePromo ? computeDiscount(activePromo, subtotal) : 0;

  const serviceCharge = subtotal * SERVICE_CHARGE_RATE;
  const sst = subtotal * SST_RATE;
  const deliveryFee = mode === "pickup" ? 0 : DELIVERY_FEE;
  const total = Math.max(
    0,
    subtotal + serviceCharge + sst + deliveryFee - discount,
  );

  const eta = calculateCustomerEta({
    fulfillment: mode,
    kitchenMinutes: storeState.kitchenPrepMinutes + busyDelta,
  });

  const deliveryShortBy = Math.max(
    0,
    storeState.deliveryMinSubtotal - subtotal,
  );
  const blockedByDeliveryMin = mode === "delivery" && deliveryShortBy > 0;

  const placeOrder = () => {
    if (!isAcceptingOrders || blockedByDeliveryMin) return;
    const order = createOrder({
      fulfillment: mode,
      address:
        mode === "delivery"
          ? (selectedAddress?.line1 ??
            "12 Jalan Ampang, 50450 Kuala Lumpur")
          : undefined,
      lines: snapshotLines(lines),
      note: note || undefined,
      subtotal,
      serviceCharge,
      sst,
      deliveryFee,
      promoCode: activePromo?.label,
      discount: discount > 0 ? discount : undefined,
      total,
    });
    go({ name: "confirmation", orderId: order.id });
  };

  const closedReason = storeState.closingToday
    ? `${venue.name} is closed for the day.`
    : storeState.status === "paused"
      ? `${venue.name} is paused — not accepting new orders right now.`
      : isOutsideHours
        ? `${venue.name} is closed${nextOpenLabel ? ` — ${nextOpenLabel.toLowerCase()}` : "."}`
        : null;

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={back} aria-label="Back" className="p-1 -ml-1">
          <BackIcon className="w-6 h-6 text-brand-ink" />
        </button>
        <h1 className="text-[17px] font-semibold text-brand-ink">Checkout</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Status banner */}
        {closedReason ? (
          <div className="mx-5 mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-3 text-[13px] text-red-800">
            {closedReason} Try again later.
          </div>
        ) : storeState.status === "busy" ? (
          <div className="mx-5 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-3 text-[13px] text-amber-800">
            Kitchen is on Busy mode — your ETA is +{busyDelta} min today.
          </div>
        ) : null}

        {/* Delivery / Pickup toggle */}
        <div className="px-5 pt-5">
          <div className="bg-brand-canvas rounded-full p-1 flex">
            <button
              onClick={() => setMode("delivery")}
              className={
                "flex-1 py-2 rounded-full text-[14px] font-semibold transition-colors " +
                (mode === "delivery"
                  ? "bg-white text-brand-ink shadow-sm"
                  : "text-brand-muted")
              }
            >
              Delivery
            </button>
            <button
              onClick={() => setMode("pickup")}
              className={
                "flex-1 py-2 rounded-full text-[14px] font-semibold transition-colors " +
                (mode === "pickup"
                  ? "bg-white text-brand-ink shadow-sm"
                  : "text-brand-muted")
              }
            >
              Pickup
            </button>
          </div>
        </div>

        {mode === "delivery" && (
          <div className="mt-5 mx-5 rounded-xl overflow-hidden relative h-36 bg-gradient-to-br from-gray-100 to-gray-200">
            <FakeMap />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none">
              <div className="w-3 h-3 rounded-full bg-brand-ink shadow-md" />
              <div className="w-0.5 h-4 bg-brand-ink" />
            </div>
            <button className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 text-[12px] font-semibold shadow-sm">
              Edit pin
            </button>
          </div>
        )}

        <div className="mt-5 px-5">
          <button
            onClick={() => setAddressSheetOpen(true)}
            className="w-full flex items-start gap-3 py-3 border-b border-gray-100 text-left"
            disabled={mode !== "delivery"}
          >
            <PinIcon className="w-5 h-5 text-brand-ink mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-brand-ink text-[15px]">
                {mode === "delivery"
                  ? (selectedAddress?.label ?? "Add address")
                  : `Pickup at ${venue.name}`}
              </div>
              <div className="text-brand-muted text-[13px] mt-0.5 truncate">
                {mode === "delivery"
                  ? (selectedAddress?.line1 ?? "Tap to add a delivery address")
                  : venue.address}
              </div>
            </div>
            {mode === "delivery" && (
              <ChevronRightIcon className="w-5 h-5 text-brand-muted mt-1" />
            )}
          </button>

          <div className="flex items-start gap-3 py-4 border-b border-gray-100">
            <ClockIcon className="w-5 h-5 text-brand-ink mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-brand-ink text-[15px]">
                {mode === "delivery" ? "Delivery time" : "Pickup time"}
              </div>
              <div className="text-brand-muted text-[13px] mt-0.5">
                Standard · ~{eta} min
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 px-5 pt-5 border-t border-gray-100">
          <h2 className="text-[17px] font-bold text-brand-ink mb-3">
            Order summary
          </h2>
          <Row label="Subtotal" value={formatRM(subtotal)} />
          <Row
            label={`Service charge (${Math.round(SERVICE_CHARGE_RATE * 100)}%)`}
            value={formatRM(serviceCharge)}
          />
          <Row
            label={`SST (${Math.round(SST_RATE * 100)}%)`}
            value={formatRM(sst)}
          />
          {mode === "delivery" && (
            <Row label="Delivery" value={formatRM(deliveryFee)} />
          )}
          {discount > 0 && activePromo && (
            <Row
              label={
                <span className="text-brand-green">
                  Discount · {activePromo.label}
                </span>
              }
              value={
                <span className="text-brand-green">-{formatRM(discount)}</span>
              }
            />
          )}
          <div className="h-px bg-gray-100 my-2" />
          <Row
            label={<span className="font-bold text-brand-ink">Total</span>}
            value={
              <span className="font-bold text-brand-ink">
                {formatRM(total)}
              </span>
            }
          />
        </div>

        <div className="mt-3 px-5 pt-4 border-t border-gray-100">
          <h2 className="text-[17px] font-bold text-brand-ink mb-3">Payment</h2>
          <div className="flex items-center gap-3 py-3 border border-gray-100 rounded-xl px-3">
            <CardIcon className="w-5 h-5 text-brand-ink" />
            <div className="flex-1 text-[14px] text-brand-ink font-semibold">
              Card •••• 4242
            </div>
            <ChevronRightIcon className="w-5 h-5 text-brand-muted" />
          </div>
          <div className="text-[12px] text-brand-muted mt-2">
            Demo only · no payment will be charged
          </div>
        </div>
      </div>

      {addressSheetOpen && (
        <AddressSheet
          addresses={profile.addresses}
          selectedId={profile.selectedAddressId}
          onSelect={(id) => {
            selectAddress(id);
            setAddressSheetOpen(false);
          }}
          onAdd={(a) => {
            const created = addAddress(a);
            selectAddress(created.id);
            setAddressSheetOpen(false);
          }}
          onClose={() => setAddressSheetOpen(false)}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100">
        <button
          disabled={!isAcceptingOrders || blockedByDeliveryMin}
          onClick={placeOrder}
          className={
            "w-full rounded-full py-3.5 font-semibold transition-colors " +
            (isAcceptingOrders && !blockedByDeliveryMin
              ? "bg-brand-green text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed")
          }
        >
          {!isAcceptingOrders
            ? "Currently unavailable"
            : blockedByDeliveryMin
              ? `Add ${formatRM(deliveryShortBy)} more for delivery`
              : `Place order · ${formatRM(total)}`}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[14px] text-brand-ink">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AddressSheet({
  addresses,
  selectedId,
  onSelect,
  onAdd,
  onClose,
}: {
  addresses: SavedAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (a: Omit<SavedAddress, "id">) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [line1, setLine1] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const l = label.trim() || "Other";
    const line = line1.trim();
    if (!line) return setError("Enter a street address.");
    onAdd({
      label: l,
      line1: line,
      instructions: instructions.trim() || undefined,
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/50">
      <div
        className="bg-white w-full rounded-t-2xl shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="text-[16px] font-bold text-brand-ink">
            Delivery address
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        {!adding ? (
          <div>
            <ul className="max-h-[55vh] overflow-y-auto">
              {addresses.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => onSelect(a.id)}
                    className="w-full flex items-start gap-3 px-5 py-3 border-b border-gray-50 text-left hover:bg-brand-canvas/60"
                  >
                    <PinIcon className="w-5 h-5 text-brand-ink mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-semibold text-brand-ink">
                        {a.label}
                      </div>
                      <div className="text-[12.5px] text-brand-muted truncate">
                        {a.line1}
                      </div>
                      {a.instructions && (
                        <div className="text-[11.5px] text-brand-muted italic truncate">
                          {a.instructions}
                        </div>
                      )}
                    </div>
                    <span
                      className={
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 " +
                        (selectedId === a.id
                          ? "border-brand-green"
                          : "border-gray-300")
                      }
                    >
                      {selectedId === a.id && (
                        <span className="w-2 h-2 rounded-full bg-brand-green" />
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setAdding(true)}
                className="w-full bg-brand-canvas rounded-full py-3 text-[14px] font-semibold text-brand-ink inline-flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-4 h-4" /> Add new address
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <div>
              <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1">
                Label
              </div>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Home, Office, Mom's place..."
                className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1">
                Address
              </div>
              <input
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Street, building, postcode"
                className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1">
                Driver instructions (optional)
              </div>
              <input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. unit number, gate code"
                className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            {error && <div className="text-red-600 text-[13px]">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAdding(false)}
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
        )}
      </div>
    </div>
  );
}

function FakeMap() {
  return (
    <svg viewBox="0 0 400 160" className="w-full h-full">
      <rect width="400" height="160" fill="#e8e8e8" />
      <path
        d="M -20 60 L 420 40"
        stroke="#ffffff"
        strokeWidth="14"
        fill="none"
      />
      <path
        d="M -20 120 L 420 100"
        stroke="#ffffff"
        strokeWidth="10"
        fill="none"
      />
      <path
        d="M 100 -10 L 140 180"
        stroke="#ffffff"
        strokeWidth="10"
        fill="none"
      />
      <path
        d="M 280 -10 L 320 180"
        stroke="#ffffff"
        strokeWidth="14"
        fill="none"
      />
      <rect x="150" y="65" width="120" height="30" fill="#f0efe8" />
      <rect x="150" y="100" width="120" height="25" fill="#f0efe8" />
      <rect x="15" y="65" width="80" height="30" fill="#f0efe8" />
      <rect x="330" y="65" width="60" height="30" fill="#f0efe8" />
    </svg>
  );
}
