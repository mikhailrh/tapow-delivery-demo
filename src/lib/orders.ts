import { selectionLabels, type CartLine } from "../context/CartContext";

export type OrderStatus =
  | "incoming"
  | "cooking"
  | "ready"
  | "collected"
  | "rejected"
  | "cancelled";

export type OrderLineSnapshot = {
  itemId: string;
  itemName: string;
  /** Resolved option labels, in modifier-group order. Empty for items with no modifiers. */
  modifierLabels: string[];
  quantity: number;
  unitPrice: number;
  /** Per-item note from the customer (free text). */
  itemNote?: string;
  /** What the kitchen should do if this item is sold out. */
  unavailableAction?: "remove" | "call";
};

export type StatusUpdate = {
  at: number;
  text: string;
  /**
   * Legacy flag. Free-text chat is now in `Order.messages`; system events here
   * never set it. Kept on the type so older persisted state still parses.
   */
  fromVendor?: boolean;
};

/**
 * Two-way chat message attached to an Order. Both vendor and customer
 * write to the same array; render side derives from `from`.
 */
export type OrderMessage = {
  id: string;
  from: "vendor" | "customer";
  /** Optional if the message is image-only. */
  text?: string;
  /**
   * Compressed JPEG data URL. Demo-only — production moves to Supabase
   * object storage (URL, not data URL). See CLAUDE.md "Future / not built yet".
   */
  image?: string;
  at: number;
};

/**
 * Opt-in review the customer promoted from a post-delivery chat message.
 * Demo-only — see CLAUDE.md for the production review-system plan.
 */
export type OrderReview = {
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  promotedFromMessageId: string;
  at: number;
};

/**
 * How long the chat stays open after delivery so the customer can leave
 * feedback. Beyond this, the thread renders read-only.
 */
export const POST_DELIVERY_CHAT_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Hard ceiling on image attachments per order thread (combined customer +
 * vendor). The cap exists because images sit in localStorage as data URLs;
 * see CLAUDE.md "Future / not built yet — image storage" for production.
 */
export const MAX_IMAGES_PER_THREAD = 2;

/** Count images currently in an order's message thread. */
export function countThreadImages(order: Order): number {
  return (order.messages ?? []).reduce(
    (n, m) => n + (m.image ? 1 : 0),
    0,
  );
}

export type ChatPhase =
  | "pre-pickup"
  | "in-transit"
  | "post-delivery"
  | "closed";

export type Driver = {
  name: string;
  initials: string;
  etaMinutes: number;
  assignedAt: number;
  phone: string;
};

export type RefundReason =
  | "Out of stock"
  | "Late"
  | "Wrong order"
  | "Other";

export type Refund = {
  amount: number;
  reason: RefundReason;
  note?: string;
  status: "pending" | "processed";
  requestedAt: number;
  processedAt?: number;
};

export type Order = {
  id: string;
  shortId: string;
  customerName: string;
  customerPhone: string;
  fulfillment: "delivery" | "pickup";
  address?: string;
  lines: OrderLineSnapshot[];
  note?: string;
  subtotal: number;
  /**
   * Tapow's 1% customer-facing platform fee. (Field was historically named
   * `serviceCharge` and held a 10% restaurant service charge — that conflated
   * the 10% vendor commission with the customer fee. Renamed to make the
   * model accurate: customer sees only this 1% platform fee.)
   */
  platformFee: number;
  sst: number;
  deliveryFee: number;
  /** Display label for the promo applied (code or auto-promo name). */
  promoCode?: string;
  /** Amount discounted off the total — already subtracted from `total`. */
  discount?: number;
  total: number;
  status: OrderStatus;
  placedAt: number;
  acceptedAt?: number;
  prepMinutes?: number;
  readyAt?: number;
  collectedAt?: number;
  rejectedAt?: number;
  cancelledAt?: number;
  /** Mocked driver leg: minutes from "ready" to driver arriving at the venue. Delivery only. */
  driverPickupMinutes?: number;
  /** Mocked driver leg: minutes from pickup to customer's address. Delivery only. */
  driverDeliveryMinutes?: number;
  rejectionReason?: string;
  rejectionItemId?: string;
  refundCredit?: number;
  /** Vendor-issued refund (separate from rejection apology credit). */
  refund?: Refund;
  driver?: Driver;
  statusUpdates: StatusUpdate[];
  /** Two-way chat thread. Empty array on fresh orders. */
  messages: OrderMessage[];
  /**
   * Last time any vendor-side surface opened this chat (broadcast cross-tab).
   * Drives the customer's blue read-tick. Distinct from the per-tab
   * `vendorLastReadAt` in [vendorReadState.ts](src/lib/vendorReadState.ts),
   * which drives the kitchen tablet's badge/chip locally and is deliberately
   * NOT broadcast.
   */
  lastReadAtVendor?: number;
  /**
   * Last time the customer scrolled to the bottom of the chat (broadcast
   * cross-tab). Drives the vendor's blue read-tick.
   */
  lastReadAtCustomer?: number;
  /** Opt-in review promoted from a post-delivery chat message. */
  review?: OrderReview;
};

export type LifecycleTone = "active" | "settled" | "terminal";

export type LifecycleLine = {
  /** Short label for the pinned status strip. */
  label: string;
  /** Optional second-line context (venue name, ETA, etc.). */
  subLabel?: string;
  /** Visual emphasis — "active" while the order is in motion. */
  tone: LifecycleTone;
  /** Mirrors `getChatPhase` so callers don't recompute. */
  phase: ChatPhase;
};

/**
 * Single-line label for the order-status anchor that sits above the chat
 * thread. Strictly a surface of `OrderStatus` + `fulfillment` — does NOT
 * imply live rider tracking, which is a separate future surface.
 */
export function lifecycleLabel(
  order: Order,
  now: number = Date.now(),
): LifecycleLine {
  const phase = getChatPhase(order, now);
  switch (order.status) {
    case "incoming":
      return { label: "Order received", tone: "active", phase };
    case "cooking":
      return { label: "Cooking now", tone: "active", phase };
    case "ready":
      return order.fulfillment === "delivery"
        ? { label: "Out for delivery", tone: "active", phase }
        : { label: "Ready for pickup", tone: "active", phase };
    case "collected":
      return order.fulfillment === "delivery"
        ? {
            label: "Delivered",
            subLabel:
              phase === "post-delivery" ? "How was it?" : undefined,
            tone: phase === "post-delivery" ? "active" : "settled",
            phase,
          }
        : {
            label: "Collected",
            subLabel:
              phase === "post-delivery" ? "How was it?" : undefined,
            tone: phase === "post-delivery" ? "active" : "settled",
            phase,
          };
    case "rejected":
      return { label: "Cancelled by venue", tone: "terminal", phase };
    case "cancelled":
      return { label: "Cancelled", tone: "terminal", phase };
  }
}

/**
 * Returns the chat-phase the order is in right now. Drives the framing the
 * status line shows above the thread and whether the customer can still
 * promote messages to reviews.
 */
export function getChatPhase(order: Order, now: number = Date.now()): ChatPhase {
  if (
    order.status === "incoming" ||
    order.status === "cooking" ||
    (order.status === "ready" && order.fulfillment === "pickup")
  ) {
    return "pre-pickup";
  }
  if (order.status === "ready" && order.fulfillment === "delivery") {
    return "in-transit";
  }
  if (order.status === "collected" && order.collectedAt !== undefined) {
    return now - order.collectedAt <= POST_DELIVERY_CHAT_WINDOW_MS
      ? "post-delivery"
      : "closed";
  }
  // rejected / cancelled — thread is closed.
  return "closed";
}

export function snapshotLines(lines: CartLine[]): OrderLineSnapshot[] {
  return lines.map((l) => ({
    itemId: l.item.id,
    itemName: l.item.name,
    modifierLabels: selectionLabels(l.item, l.selections),
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    ...(l.itemNote ? { itemNote: l.itemNote } : {}),
    ...(l.unavailableAction && l.unavailableAction !== "remove"
      ? { unavailableAction: l.unavailableAction }
      : {}),
  }));
}

const NAME_POOL = [
  "Daniel R.",
  "Aisyah K.",
  "Kiran M.",
  "Lee J.",
  "Hafiz O.",
  "Sara T.",
  "Marcus L.",
  "Priya S.",
  "Amir B.",
  "Wei N.",
  "Joey C.",
  "Farah Z.",
];

const DRIVER_POOL: { name: string; initials: string; phone: string }[] = [
  { name: "Faiz A.", initials: "FA", phone: "+60198765432" },
  { name: "Ravi K.", initials: "RK", phone: "+60192345678" },
  { name: "Boon S.", initials: "BS", phone: "+60187654321" },
  { name: "Hasan M.", initials: "HM", phone: "+60165432109" },
];

export function fakeName(seed?: number) {
  const idx =
    typeof seed === "number"
      ? seed % NAME_POOL.length
      : Math.floor(Math.random() * NAME_POOL.length);
  return NAME_POOL[idx];
}

export function fakePhone() {
  const last4 = Math.floor(1000 + Math.random() * 9000);
  return `+60123456${last4}`;
}

export function pickDriver(seed?: number): Driver {
  const idx =
    typeof seed === "number"
      ? seed % DRIVER_POOL.length
      : Math.floor(Math.random() * DRIVER_POOL.length);
  const d = DRIVER_POOL[idx];
  return {
    ...d,
    etaMinutes: 5 + Math.floor(Math.random() * 6),
    assignedAt: Date.now(),
  };
}

/** Strip non-digits for tel: / wa.me URLs. */
export function digitsOnly(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

/** Time elapsed since `at`, formatted compactly. */
export function elapsedLabel(now: number, at: number) {
  const sec = Math.max(0, Math.floor((now - at) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin === 0 ? `${hr}h` : `${hr}h ${remMin}m`;
}

/**
 * Aging fraction for a card in COOKING — 0..1+ where 1 is "should be ready now."
 * 0–0.8 = white, 0.8–1.0 = yellow, 1.0–1.2 = amber, 1.2+ = red pulse.
 */
export function cookingAging(order: Order, now: number): number {
  if (!order.acceptedAt || !order.prepMinutes) return 0;
  const elapsedMs = now - order.acceptedAt;
  const totalMs = order.prepMinutes * 60_000;
  return totalMs <= 0 ? 0 : elapsedMs / totalMs;
}

/** Random driver-leg minutes for a fresh delivery order. Once stored on the order they don't move. */
export const DRIVER_PICKUP_MIN = 5;
export const DRIVER_PICKUP_MAX = 10;
export const DRIVER_DELIVERY_MIN = 10;
export const DRIVER_DELIVERY_MAX = 20;
export const AVG_DRIVER_PICKUP =
  (DRIVER_PICKUP_MIN + DRIVER_PICKUP_MAX) / 2;
export const AVG_DRIVER_DELIVERY =
  (DRIVER_DELIVERY_MIN + DRIVER_DELIVERY_MAX) / 2;

export function rollDriverLegs(): {
  driverPickupMinutes: number;
  driverDeliveryMinutes: number;
} {
  const pickup =
    DRIVER_PICKUP_MIN +
    Math.floor(Math.random() * (DRIVER_PICKUP_MAX - DRIVER_PICKUP_MIN + 1));
  const delivery =
    DRIVER_DELIVERY_MIN +
    Math.floor(
      Math.random() * (DRIVER_DELIVERY_MAX - DRIVER_DELIVERY_MIN + 1),
    );
  return { driverPickupMinutes: pickup, driverDeliveryMinutes: delivery };
}

/**
 * Customer-facing total ETA in minutes.
 *
 * Pickup: kitchen prep only.
 * Delivery: kitchen prep + driver-pickup leg + driver-delivery leg.
 *
 * Pass an Order *or* a fulfillment + kitchenMin pair (for pre-creation checkout).
 * If driver legs aren't provided (pre-creation), fall back to the midpoint of
 * the random ranges so the checkout estimate doesn't drift far from the real
 * legs we'll roll at order creation.
 */
export function calculateCustomerEta(input: {
  fulfillment: "delivery" | "pickup";
  kitchenMinutes: number;
  driverPickupMinutes?: number;
  driverDeliveryMinutes?: number;
}): number {
  const { fulfillment, kitchenMinutes } = input;
  if (fulfillment === "pickup") return Math.round(kitchenMinutes);
  const pickup = input.driverPickupMinutes ?? AVG_DRIVER_PICKUP;
  const delivery = input.driverDeliveryMinutes ?? AVG_DRIVER_DELIVERY;
  return Math.round(kitchenMinutes + pickup + delivery);
}

export function calculateOrderCustomerEta(
  order: Order,
  defaultKitchenPrep: number,
): number {
  return calculateCustomerEta({
    fulfillment: order.fulfillment,
    kitchenMinutes: order.prepMinutes ?? defaultKitchenPrep,
    driverPickupMinutes: order.driverPickupMinutes,
    driverDeliveryMinutes: order.driverDeliveryMinutes,
  });
}
