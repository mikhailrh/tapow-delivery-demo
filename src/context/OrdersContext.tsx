import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadJSON, saveJSON, scopedKey, subscribeToKey } from "../lib/sync";
import {
  calculateCustomerEta,
  fakeName,
  fakePhone,
  pickDriver,
  rollDriverLegs,
  type Driver,
  type Order,
  type OrderLineSnapshot,
  type OrderMessage,
  type OrderStatus,
  type RefundReason,
} from "../lib/orders";
import {
  PLATFORM_FEE_RATE,
  SST_RATE,
} from "../lib/money";
import { useVenue } from "./VenueContext";
import type { Venue } from "../data/venues";
import { markChatRead } from "../lib/vendorReadState";

const KEY = "orders.v1";
// Bumped on any persisted-Order shape change so older browsers re-seed once
// instead of rendering stale data. v4: messages/review fields. v5: 10%
// serviceCharge → 1% platformFee (field rename + rate correction). v6: cross-
// party read-receipt fields (lastReadAtVendor / lastReadAtCustomer) + the
// Sara T. unread-message seed.
const SEED_FLAG_SUFFIX = "everSeeded.v6";

/** Demo-only id generator — fine for client-side ordering of chat messages. */
function newMessageId(): string {
  return (
    "m_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

export type ChatPayload = {
  text?: string;
  image?: string;
};

type OrdersState = {
  orders: Order[];
  nextOrderNum: number;
};

const empty: OrdersState = { orders: [], nextOrderNum: 1 };

type CreateOrderInput = {
  fulfillment: "delivery" | "pickup";
  address?: string;
  lines: Order["lines"];
  note?: string;
  subtotal: number;
  platformFee: number;
  sst: number;
  deliveryFee: number;
  promoCode?: string;
  discount?: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
};

type OrdersContextValue = {
  orders: Order[];
  getById: (id: string) => Order | undefined;
  createOrder: (input: CreateOrderInput) => Order;
  acceptOrder: (id: string, prepMinutes: number) => void;
  markReady: (id: string) => void;
  markCollected: (id: string) => void;
  rejectOrder: (
    id: string,
    reason: string,
    rejectionItemId?: string,
    refundCredit?: number,
  ) => void;
  /** Customer-initiated cancellation while still incoming. */
  cancelOrder: (id: string) => void;
  /** Vendor pushes prep time out by N minutes; statusUpdate to customer. */
  pushBackEta: (id: string, addMinutes: number) => void;
  /**
   * Free-text and/or image message from the kitchen to the customer.
   * Writes to `Order.messages` (the two-way chat thread), NOT `statusUpdates`.
   */
  sendVendorMessage: (id: string, payload: ChatPayload) => void;
  /**
   * Customer-side counterpart of `sendVendorMessage`. Same `messages` array.
   */
  sendCustomerMessage: (id: string, payload: ChatPayload) => void;
  /**
   * Opt-in: customer promotes one of their own post-delivery messages into a
   * review (stars + the message's text). No-op if the message isn't theirs,
   * doesn't exist, or the post-delivery window has closed.
   */
  promoteMessageToReview: (
    id: string,
    messageId: string,
    rating: 1 | 2 | 3 | 4 | 5,
  ) => void;
  /**
   * Cross-party read-receipt — bumps `lastReadAtVendor` or `lastReadAtCustomer`
   * to now. Monotonic. Broadcasts via the existing Order sync so the other
   * party's blue tick can flip in real time. Distinct from
   * [vendorReadState.markChatRead](src/lib/vendorReadState.ts) which drives
   * the per-tab kebab badge and is deliberately NOT broadcast.
   */
  markPartyRead: (id: string, from: "vendor" | "customer") => void;
  /** Issue a partial/full refund. Status flips pending → processed after a 2s mock delay. */
  issueRefund: (
    id: string,
    amount: number,
    reason: RefundReason,
    note?: string,
  ) => void;
  /**
   * Replace an order's lines (after vendor talks to the customer about a sub /
   * qty change / removal). Recalculates subtotal / platform fee / SST / total.
   * Preserves deliveryFee and discount as-is. If the new total is lower than
   * the old, auto-issues a partial refund for the difference. Pushes a single
   * status update with `summary` so the customer sees one combined message
   * instead of one per line.
   */
  applyOrderEdits: (
    id: string,
    newLines: OrderLineSnapshot[],
    summary: string,
  ) => void;
  /** Restore an order to a prior status — used by undo snackbars. */
  setStatus: (id: string, status: OrderStatus) => void;
  /** Replace an order entirely — used by undo to restore captured snapshot. */
  restoreOrder: (snapshot: Order) => void;
  /** Reset everything (Demo controls action). */
  resetAll: (seedHistory?: boolean) => void;
  /** True after we've populated seed history — used by Demo controls UI. */
  hasOrders: boolean;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

/** Fill defaults for fields added after orders.v1's original shape. */
function normalizeOrder(o: Order): Order {
  if (o.messages) return o;
  return { ...o, messages: [] };
}

function read(): OrdersState {
  const raw = loadJSON(KEY, empty);
  return { ...raw, orders: raw.orders.map(normalizeOrder) };
}

function commit(s: OrdersState) {
  saveJSON(KEY, s);
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const venue = useVenue();
  const [state, setState] = useState<OrdersState>(read);

  useEffect(() => {
    return subscribeToKey(KEY, () => setState(read()));
  }, []);

  // Auto-seed on first ever visit (per browser, per venue) so the demo isn't
  // an empty kanban. Once the user explicitly Wipes, the flag stays set and
  // we don't auto-seed again — they can still hit "Seed history" manually.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const flagKey = scopedKey(SEED_FLAG_SUFFIX);
    if (localStorage.getItem(flagKey) === "1") return;
    const seeded = buildSeedHistory(venue);
    commit(seeded);
    setState(seeded);
    try {
      localStorage.setItem(flagKey, "1");
    } catch {
      /* quota / SSR */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);

  const update = useCallback(
    (updater: (prev: OrdersState) => OrdersState) => {
      setState((prev) => {
        const next = updater(prev);
        commit(next);
        return next;
      });
    },
    [],
  );

  const getById = useCallback(
    (id: string) => state.orders.find((o) => o.id === id),
    [state.orders],
  );

  const createOrder = useCallback<OrdersContextValue["createOrder"]>(
    (input) => {
      let created: Order | null = null;
      update((prev) => {
        const num = prev.nextOrderNum;
        const shortId = String(num).padStart(3, "0");
        const driverLegs =
          input.fulfillment === "delivery" ? rollDriverLegs() : {};
        const order: Order = {
          id: `${venue.orderIdPrefix}-${shortId}`,
          shortId,
          customerName: input.customerName ?? fakeName(num),
          customerPhone: input.customerPhone ?? fakePhone(),
          fulfillment: input.fulfillment,
          address: input.address,
          lines: input.lines,
          note: input.note,
          subtotal: input.subtotal,
          platformFee: input.platformFee,
          sst: input.sst,
          deliveryFee: input.deliveryFee,
          promoCode: input.promoCode,
          discount: input.discount,
          total: input.total,
          status: "incoming",
          placedAt: Date.now(),
          ...driverLegs,
          statusUpdates: [
            {
              at: Date.now(),
              text: `Order received — waiting for ${venue.name} to confirm.`,
            },
          ],
          messages: [],
        };
        created = order;
        return { orders: [...prev.orders, order], nextOrderNum: num + 1 };
      });
      return created!;
    },
    [update, venue],
  );

  const acceptOrder = useCallback<OrdersContextValue["acceptOrder"]>(
    (id, prepMinutes) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          const now = Date.now();
          const driver: Driver | undefined =
            o.fulfillment === "delivery"
              ? o.driver ?? pickDriver(prev.nextOrderNum)
              : undefined;
          const totalEta = calculateCustomerEta({
            fulfillment: o.fulfillment,
            kitchenMinutes: prepMinutes,
            driverPickupMinutes: o.driverPickupMinutes,
            driverDeliveryMinutes: o.driverDeliveryMinutes,
          });
          const text =
            o.fulfillment === "delivery"
              ? `Order accepted — kitchen working on it (~${prepMinutes} min). Total ETA to your door ~${totalEta} min.`
              : `Order accepted — kitchen working on it. Ready for pickup in ~${prepMinutes} min.`;
          return {
            ...o,
            status: "cooking" as OrderStatus,
            acceptedAt: now,
            prepMinutes,
            driver,
            statusUpdates: [
              ...o.statusUpdates,
              { at: now, text },
            ],
          };
        }),
      }));
    },
    [update],
  );

  const markReady = useCallback<OrdersContextValue["markReady"]>(
    (id) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          const now = Date.now();
          const text =
            o.fulfillment === "delivery"
              ? `Food's ready — ${o.driver?.name ?? "your driver"} is collecting now (~${o.driverPickupMinutes ?? 7} min). They'll be at your door in ~${o.driverDeliveryMinutes ?? 15} min after that.`
              : `Your order is ready! Come collect it at the counter.`;
          return {
            ...o,
            status: "ready" as OrderStatus,
            readyAt: now,
            statusUpdates: [...o.statusUpdates, { at: now, text }],
          };
        }),
      }));
    },
    [update],
  );

  const markCollected = useCallback<OrdersContextValue["markCollected"]>(
    (id) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          const now = Date.now();
          const text =
            o.fulfillment === "delivery"
              ? `Delivered — enjoy! Thanks for ordering with ${venue.name} 🐔`
              : "Order collected — thanks for stopping by! 🐔";
          return {
            ...o,
            status: "collected" as OrderStatus,
            collectedAt: now,
            statusUpdates: [...o.statusUpdates, { at: now, text }],
          };
        }),
      }));
    },
    [update, venue],
  );

  const rejectOrder = useCallback<OrdersContextValue["rejectOrder"]>(
    (id, reason, rejectionItemId, refundCredit = 5) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          const now = Date.now();
          const text = `So sorry — we had to cancel your order (${reason.toLowerCase()}). Full refund processed, plus RM${refundCredit} credit for your next order.`;
          return {
            ...o,
            status: "rejected" as OrderStatus,
            rejectedAt: now,
            rejectionReason: reason,
            rejectionItemId,
            refundCredit,
            statusUpdates: [...o.statusUpdates, { at: now, text }],
          };
        }),
      }));
    },
    [update],
  );

  const cancelOrder = useCallback<OrdersContextValue["cancelOrder"]>(
    (id) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          if (o.status !== "incoming") return o;
          const now = Date.now();
          return {
            ...o,
            status: "cancelled" as OrderStatus,
            cancelledAt: now,
            statusUpdates: [
              ...o.statusUpdates,
              {
                at: now,
                text: "Order cancelled — full refund processed back to your card.",
              },
            ],
          };
        }),
      }));
    },
    [update],
  );

  const pushBackEta = useCallback<OrdersContextValue["pushBackEta"]>(
    (id, addMinutes) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          if (!o.prepMinutes || !o.acceptedAt) return o;
          const newPrep = o.prepMinutes + addMinutes;
          const newTotal = calculateCustomerEta({
            fulfillment: o.fulfillment,
            kitchenMinutes: newPrep,
            driverPickupMinutes: o.driverPickupMinutes,
            driverDeliveryMinutes: o.driverDeliveryMinutes,
          });
          const now = Date.now();
          const text =
            o.fulfillment === "delivery"
              ? `Heads up — we're running ${addMinutes} min late in the kitchen. New total ETA to your door ~${newTotal} min. Sorry for the wait!`
              : `Heads up — we're running ${addMinutes} min late. Pickup ETA now ~${newPrep} min. Sorry for the wait!`;
          return {
            ...o,
            prepMinutes: newPrep,
            statusUpdates: [
              ...o.statusUpdates,
              { at: now, text },
            ],
          };
        }),
      }));
    },
    [update],
  );

  const appendMessage = useCallback(
    (id: string, from: OrderMessage["from"], payload: ChatPayload) => {
      const text = payload.text?.trim();
      const image = payload.image;
      if (!text && !image) return;
      const message: OrderMessage = {
        id: newMessageId(),
        from,
        ...(text ? { text } : {}),
        ...(image ? { image } : {}),
        at: Date.now(),
      };
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          return {
            ...o,
            messages: [...(o.messages ?? []), message],
          };
        }),
      }));
    },
    [update],
  );

  const sendVendorMessage = useCallback<
    OrdersContextValue["sendVendorMessage"]
  >(
    (id, payload) => appendMessage(id, "vendor", payload),
    [appendMessage],
  );

  const sendCustomerMessage = useCallback<
    OrdersContextValue["sendCustomerMessage"]
  >(
    (id, payload) => appendMessage(id, "customer", payload),
    [appendMessage],
  );

  const promoteMessageToReview = useCallback<
    OrdersContextValue["promoteMessageToReview"]
  >(
    (id, messageId, rating) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          const msg = (o.messages ?? []).find((m) => m.id === messageId);
          if (!msg || msg.from !== "customer") return o;
          const text = msg.text?.trim();
          if (!text) return o;
          return {
            ...o,
            review: {
              rating,
              text,
              promotedFromMessageId: messageId,
              at: Date.now(),
            },
          };
        }),
      }));
    },
    [update],
  );

  const markPartyRead = useCallback<OrdersContextValue["markPartyRead"]>(
    (id, from) => {
      const now = Date.now();
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          const field =
            from === "vendor" ? "lastReadAtVendor" : "lastReadAtCustomer";
          // Monotonic — never go backwards. Drops silent no-op writes when
          // an effect fires repeatedly while at the bottom of the thread.
          if ((o[field] ?? 0) >= now) return o;
          return { ...o, [field]: now };
        }),
      }));
    },
    [update],
  );

  const issueRefund = useCallback<OrdersContextValue["issueRefund"]>(
    (id, amount, reason, note) => {
      const requestedAt = Date.now();
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          return {
            ...o,
            refund: {
              amount,
              reason,
              note,
              status: "pending",
              requestedAt,
            },
            statusUpdates: [
              ...o.statusUpdates,
              {
                at: requestedAt,
                text: `Refund of RM${amount.toFixed(2)} processing — back to your card in 3–5 business days. Reason: ${reason.toLowerCase()}.`,
              },
            ],
          };
        }),
      }));
      setTimeout(() => {
        update((prev) => ({
          ...prev,
          orders: prev.orders.map((o) => {
            if (o.id !== id || !o.refund) return o;
            if (o.refund.status === "processed") return o;
            return {
              ...o,
              refund: {
                ...o.refund,
                status: "processed",
                processedAt: Date.now(),
              },
            };
          }),
        }));
      }, 2000);
    },
    [update],
  );

  const applyOrderEdits = useCallback<OrdersContextValue["applyOrderEdits"]>(
    (id, newLines, summary) => {
      if (newLines.length === 0) return;
      const trimmedSummary = summary.trim();
      const now = Date.now();
      let refundAmount = 0;
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          if (o.status !== "incoming" && o.status !== "cooking") return o;
          const subtotal = newLines.reduce(
            (acc, l) => acc + l.unitPrice * l.quantity,
            0,
          );
          const platformFee = subtotal * PLATFORM_FEE_RATE;
          const sst = subtotal * SST_RATE;
          const newTotal = Math.max(
            0,
            subtotal +
              platformFee +
              sst +
              o.deliveryFee -
              (o.discount ?? 0),
          );
          refundAmount = Math.max(0, +(o.total - newTotal).toFixed(2));
          return {
            ...o,
            lines: newLines,
            subtotal,
            platformFee,
            sst,
            total: newTotal,
            statusUpdates: [
              ...o.statusUpdates,
              {
                at: now,
                text: trimmedSummary,
              },
            ],
          };
        }),
      }));
      if (refundAmount > 0.01) {
        // Pre-paid orders: dropping items / qty owes the customer money.
        // Mirror issueRefund's pending → processed mock cycle.
        update((prev) => ({
          ...prev,
          orders: prev.orders.map((o) => {
            if (o.id !== id) return o;
            // `requestedAt` is the timestamp the refund-announcement bubble
            // carries — kept identical so the customer-side refund pill can
            // anchor on `statusUpdate.at === refund.requestedAt` instead of
            // sniffing message text.
            const announceAt = now + 1;
            return {
              ...o,
              refund: {
                amount: refundAmount,
                reason: "Out of stock",
                note: "Order edited by kitchen",
                status: "pending",
                requestedAt: announceAt,
              },
              statusUpdates: [
                ...o.statusUpdates,
                {
                  at: announceAt,
                  text: `Partial refund of RM${refundAmount.toFixed(2)} processing — back to your card in 3–5 business days.`,
                },
              ],
            };
          }),
        }));
        setTimeout(() => {
          update((prev) => ({
            ...prev,
            orders: prev.orders.map((o) => {
              if (o.id !== id || !o.refund) return o;
              if (o.refund.status === "processed") return o;
              return {
                ...o,
                refund: {
                  ...o.refund,
                  status: "processed",
                  processedAt: Date.now(),
                },
              };
            }),
          }));
        }, 2000);
      }
    },
    [update],
  );

  const setStatus = useCallback<OrdersContextValue["setStatus"]>(
    (id, status) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === id ? { ...o, status } : o,
        ),
      }));
    },
    [update],
  );

  const restoreOrder = useCallback<OrdersContextValue["restoreOrder"]>(
    (snapshot) => {
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === snapshot.id ? snapshot : o,
        ),
      }));
    },
    [update],
  );

  const resetAll = useCallback<OrdersContextValue["resetAll"]>(
    (seedHistory = true) => {
      const seeded = seedHistory ? buildSeedHistory(venue) : empty;
      update(() => seeded);
    },
    [update, venue],
  );

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders: state.orders,
      getById,
      createOrder,
      acceptOrder,
      markReady,
      markCollected,
      rejectOrder,
      cancelOrder,
      pushBackEta,
      sendVendorMessage,
      sendCustomerMessage,
      promoteMessageToReview,
      markPartyRead,
      issueRefund,
      applyOrderEdits,
      setStatus,
      restoreOrder,
      resetAll,
      hasOrders: state.orders.length > 0,
    }),
    [
      state.orders,
      getById,
      createOrder,
      acceptOrder,
      markReady,
      markCollected,
      rejectOrder,
      cancelOrder,
      pushBackEta,
      sendVendorMessage,
      sendCustomerMessage,
      promoteMessageToReview,
      markPartyRead,
      issueRefund,
      applyOrderEdits,
      setStatus,
      restoreOrder,
      resetAll,
    ],
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside OrdersProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*                          Seed data                                 */
/* ------------------------------------------------------------------ */

type ItemDef = {
  name: string;
  qty: number;
  price: number;
  choices?: string[];
};

const PLATFORM_FEE = 0.01;
const SST = 0.06;

const DELIVERY_ADDRESSES = [
  "12 Jalan Ampang, 50450 KL",
  "8 Persiaran Hampshire, 50450 KL",
  "27 Jalan Yap Kwan Seng, 50450 KL",
  "B-3-1 Lorong Mamanda 1, Ampang",
  "55 Jalan Tasik, 55000 KL",
];

const DRIVER_BY_INDEX = [
  { name: "Faiz A.", initials: "FA", phone: "+60198765432" },
  { name: "Ravi K.", initials: "RK", phone: "+60192345678" },
  { name: "Boon S.", initials: "BS", phone: "+60187654321" },
  { name: "Hasan M.", initials: "HM", phone: "+60165432109" },
];

function makeLines(items: ItemDef[]) {
  return items.map((i) => ({
    itemId: i.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    itemName: i.name,
    modifierLabels: (i.choices ?? []).filter(Boolean),
    quantity: i.qty,
    unitPrice: i.price,
  }));
}

function seedDriverLegs(
  fulfillment: "delivery" | "pickup",
): { driverPickupMinutes?: number; driverDeliveryMinutes?: number } {
  if (fulfillment !== "delivery") return {};
  return rollDriverLegs();
}

function makeTotals(items: ItemDef[], fulfillment: "delivery" | "pickup") {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const platformFee = subtotal * PLATFORM_FEE;
  const sst = subtotal * SST;
  const deliveryFee = fulfillment === "delivery" ? 5 : 0;
  const total = subtotal + platformFee + sst + deliveryFee;
  return { subtotal, platformFee, sst, deliveryFee, total };
}

function buildSeedHistory(venue: Venue): OrdersState {
  if (venue.menu.length === 0) return empty;
  if (venue.slug === "fowlboys") return buildFowlBoysSeed(venue);
  return buildGenericSeed(venue);
}

function buildFowlBoysSeed(venue: Venue): OrdersState {
  const now = Date.now();
  const HOUR = 3_600_000;
  const prefix = venue.orderIdPrefix;
  const venueName = venue.name;

  // ------------------------------------------------------------------
  // Historical (terminal) — populates the History screen
  // ------------------------------------------------------------------
  const historyDefs: Array<{
    minsAgo: number;
    name: string;
    fulfillment: "delivery" | "pickup";
    items: ItemDef[];
    status: "collected" | "rejected";
    rejectionReason?: string;
  }> = [
    {
      minsAgo: 95,
      name: "Aisyah K.",
      fulfillment: "delivery",
      items: [
        { name: "Bone In", qty: 1, price: 39, choices: ["3 pieces", "Hot", "Hot Honey Ranch", "House Slaw"] },
        { name: "Crack Fries", qty: 1, price: 15 },
        { name: "Half & Half", qty: 1, price: 9 },
      ],
      status: "collected",
    },
    {
      minsAgo: 130,
      name: "Marcus L.",
      fulfillment: "pickup",
      items: [
        { name: "Nashville Sandwich", qty: 1, price: 26, choices: ["Xtra Hot"] },
        { name: "Buffalo Ranch Tots", qty: 1, price: 25 },
      ],
      status: "collected",
    },
    {
      minsAgo: 175,
      name: "Priya S.",
      fulfillment: "delivery",
      items: [
        { name: "Tenders", qty: 2, price: 22, choices: ["3 pieces", "Mild", "Ranch", "Mash & Gravy"] },
        { name: "Soft Drink", qty: 2, price: 9 },
      ],
      status: "collected",
    },
    {
      minsAgo: 220,
      name: "Daniel R.",
      fulfillment: "pickup",
      items: [
        { name: "Off The Hook", qty: 1, price: 24 },
        { name: "Disco Fries", qty: 1, price: 20 },
      ],
      status: "rejected",
      rejectionReason: "Out of stock",
    },
    {
      minsAgo: 260,
      name: "Hafiz O.",
      fulfillment: "delivery",
      items: [
        { name: "Chicken & Waffle", qty: 1, price: 35 },
        { name: "Marvin's Room", qty: 1, price: 18 },
        { name: "Vanilla", qty: 1, price: 20 },
      ],
      status: "collected",
    },
    {
      minsAgo: 24 * 60,
      name: "Sara T.",
      fulfillment: "delivery",
      items: [
        { name: "Wings", qty: 1, price: 38, choices: ["4 pieces", "XX Hot (+RM10.00)", "Cluck Sauce", "House Slaw"] },
        { name: "Mac N Cheese", qty: 1, price: 18 },
      ],
      status: "collected",
    },
    {
      minsAgo: 26 * 60,
      name: "Joey C.",
      fulfillment: "pickup",
      items: [
        { name: "Motherclucker", qty: 1, price: 25, choices: ["Hot"] },
        { name: "Chicken Sando", qty: 1, price: 26, choices: ["Mild"] },
        { name: "Lemonade", qty: 2, price: 9 },
      ],
      status: "collected",
    },
    {
      minsAgo: 28 * 60,
      name: "Wei N.",
      fulfillment: "delivery",
      items: [
        { name: "Penne Pesto", qty: 1, price: 24 },
        { name: "House Salad", qty: 1, price: 18 },
        { name: "Chocolate", qty: 1, price: 20 },
      ],
      status: "collected",
    },
    {
      minsAgo: 48 * 60,
      name: "Farah Z.",
      fulfillment: "pickup",
      items: [
        { name: "Bone In", qty: 1, price: 30, choices: ["2 pieces", "Mild", "Garlic Aioli", "House Slaw"] },
        { name: "Tater Tots", qty: 1, price: 18 },
      ],
      status: "collected",
    },
    {
      minsAgo: 72 * 60,
      name: "Kiran M.",
      fulfillment: "delivery",
      items: [
        { name: "OG Sandwich", qty: 2, price: 24, choices: ["Hot"] },
        { name: "Disco Fries", qty: 1, price: 20 },
        { name: "Strawberry", qty: 1, price: 20 },
      ],
      status: "collected",
    },
  ];

  // ------------------------------------------------------------------
  // INCOMING — placed in the last few minutes, awaiting Accept
  // ------------------------------------------------------------------
  const incomingDefs: Array<{
    secsAgo: number;
    name: string;
    fulfillment: "delivery" | "pickup";
    items: ItemDef[];
    note?: string;
  }> = [
    {
      secsAgo: 25,
      name: "Joey C.",
      fulfillment: "delivery",
      items: [
        { name: "Bone In", qty: 1, price: 39, choices: ["3 pieces", "XX Hot (+RM7.50)", "Hot Honey Ranch", "House Slaw"] },
        { name: "Disco Fries", qty: 1, price: 20 },
        { name: "Half & Half", qty: 2, price: 9 },
      ],
    },
    {
      secsAgo: 70,
      name: "Marcus L.",
      fulfillment: "pickup",
      items: [
        { name: "Nashville Sandwich", qty: 1, price: 26, choices: ["Hot"] },
        { name: "Crack Fries", qty: 1, price: 15 },
      ],
    },
    {
      secsAgo: 120,
      name: "Aisyah K.",
      fulfillment: "delivery",
      items: [
        { name: "Tenders", qty: 1, price: 27, choices: ["5 pieces", "Mild", "Ranch", "Mash & Gravy"] },
        { name: "Mac N Cheese", qty: 1, price: 18 },
        { name: "Soft Drink", qty: 2, price: 9 },
      ],
    },
    {
      secsAgo: 165,
      name: "Hafiz O.",
      fulfillment: "pickup",
      items: [
        { name: "Off The Hook", qty: 1, price: 24 },
        { name: "Tater Tots", qty: 1, price: 18 },
        { name: "Vanilla", qty: 1, price: 20 },
      ],
      note: "Extra crispy please, no pickles.",
    },
    {
      secsAgo: 230,
      name: "Wei N.",
      fulfillment: "delivery",
      items: [
        { name: "Wings", qty: 1, price: 38, choices: ["4 pieces", "Hot", "Cluck Sauce", "House Slaw"] },
        { name: "Loaded Fries", qty: 1, price: 28 },
      ],
    },
  ];

  // ------------------------------------------------------------------
  // COOKING — accepted at varying ages so the kanban shows the color
  // gradient (white → yellow at ~80% → amber at 100% → red pulse 120%+)
  // ------------------------------------------------------------------
  const cookingDefs: Array<{
    placedSecsAgo: number;
    acceptedSecsAgo: number;
    prepMinutes: number;
    name: string;
    fulfillment: "delivery" | "pickup";
    items: ItemDef[];
    note?: string;
    driverEta?: number;
  }> = [
    // Fresh (~20% prep elapsed)
    {
      placedSecsAgo: 360,
      acceptedSecsAgo: 300, // 5 min ago
      prepMinutes: 25,
      name: "Daniel R.",
      fulfillment: "delivery",
      items: [
        { name: "Bone In", qty: 1, price: 30, choices: ["2 pieces", "Mild", "Garlic Aioli", "House Slaw"] },
        { name: "Crack Fries", qty: 1, price: 15 },
      ],
      driverEta: 9,
    },
    // Mid (~52% prep elapsed)
    {
      placedSecsAgo: 840,
      acceptedSecsAgo: 780, // 13 min ago
      prepMinutes: 25,
      name: "Sara T.",
      fulfillment: "pickup",
      items: [
        { name: "Chicken & Waffle", qty: 1, price: 35 },
        { name: "Lemonade", qty: 1, price: 9 },
      ],
    },
    // Yellow (~84% prep elapsed)
    {
      placedSecsAgo: 1320,
      acceptedSecsAgo: 1260, // 21 min ago
      prepMinutes: 25,
      name: "Priya S.",
      fulfillment: "delivery",
      items: [
        { name: "OG Sandwich", qty: 2, price: 24, choices: ["Hot"] },
        { name: "Disco Fries", qty: 1, price: 20 },
        { name: "Half & Half", qty: 1, price: 9 },
      ],
      driverEta: 6,
    },
    // Amber (~112% prep elapsed — overdue)
    {
      placedSecsAgo: 1740,
      acceptedSecsAgo: 1680, // 28 min ago
      prepMinutes: 25,
      name: "Boon Family",
      fulfillment: "pickup",
      items: [
        { name: "Motherclucker", qty: 1, price: 25, choices: ["Xtra Hot (+RM2.50)"] },
        { name: "Buffalo Ranch Tots", qty: 1, price: 25 },
        { name: "Soft Drink", qty: 2, price: 9 },
      ],
      note: "Picking up at 7pm, kids' birthday.",
    },
  ];

  // ------------------------------------------------------------------
  // READY — passed prep, waiting on collection
  // ------------------------------------------------------------------
  const readyDefs: Array<{
    placedSecsAgo: number;
    acceptedSecsAgo: number;
    readySecsAgo: number;
    prepMinutes: number;
    name: string;
    fulfillment: "delivery" | "pickup";
    items: ItemDef[];
    driverEta?: number;
  }> = [
    {
      placedSecsAgo: 60 * 30,
      acceptedSecsAgo: 60 * 29,
      readySecsAgo: 90,
      prepMinutes: 25,
      name: "Farah Z.",
      fulfillment: "pickup",
      items: [
        { name: "Sugar Daddy", qty: 1, price: 25, choices: ["Mild"] },
        { name: "Lemonade", qty: 1, price: 9 },
      ],
    },
    {
      placedSecsAgo: 60 * 32,
      acceptedSecsAgo: 60 * 31,
      readySecsAgo: 30,
      prepMinutes: 25,
      name: "Kiran M.",
      fulfillment: "delivery",
      items: [
        { name: "Penne Pesto", qty: 1, price: 24 },
        { name: "Vanilla", qty: 1, price: 20 },
        { name: "Strawberry", qty: 1, price: 20 },
      ],
      driverEta: 6,
    },
    {
      placedSecsAgo: 60 * 35,
      acceptedSecsAgo: 60 * 34,
      readySecsAgo: 240,
      prepMinutes: 25,
      name: "Lee J.",
      fulfillment: "pickup",
      items: [
        { name: "The Cluckfather", qty: 1, price: 28, choices: ["Hot"] },
        { name: "French Toast", qty: 1, price: 20 },
      ],
    },
  ];

  // ------------------------------------------------------------------
  // Build & sort
  // ------------------------------------------------------------------
  // `messages` is filled in post-build by `normalizeOrder` so the per-literal
  // build callbacks below don't have to repeat `messages: []` in each return.
  type Built = {
    placedAt: number;
    build: (shortId: string) => Omit<Order, "messages">;
  };
  const builders: Built[] = [];

  // History (terminal)
  for (const def of historyDefs) {
    const placedAt = now - def.minsAgo * 60_000;
    const acceptedAt = placedAt + 90_000;
    const readyAt = acceptedAt + 22 * 60_000;
    const collectedAt =
      readyAt + (def.fulfillment === "delivery" ? 18 : 6) * 60_000;
    const { subtotal, platformFee, sst, deliveryFee, total } = makeTotals(
      def.items,
      def.fulfillment,
    );
    const lines = makeLines(def.items);
    const driverLegs = seedDriverLegs(def.fulfillment);
    builders.push({
      placedAt,
      build: (shortId) => {
        if (def.status === "rejected") {
          return {
            id: `${prefix}-${shortId}`,
            shortId,
            customerName: def.name,
            customerPhone: fakePhone(),
            fulfillment: def.fulfillment,
            address:
              def.fulfillment === "delivery"
                ? DELIVERY_ADDRESSES[0]
                : undefined,
            lines,
            subtotal,
            platformFee,
            sst,
            deliveryFee,
            total,
            status: "rejected",
            placedAt,
            rejectedAt: placedAt + 60_000,
            rejectionReason: def.rejectionReason ?? "Out of stock",
            refundCredit: 5,
            ...driverLegs,
            statusUpdates: [
              { at: placedAt, text: "Order received." },
              {
                at: placedAt + 60_000,
                text: `Cancelled by ${venueName} (${(def.rejectionReason ?? "out of stock").toLowerCase()}). Refunded.`,
              },
            ],
          };
        }
        return {
          id: `${prefix}-${shortId}`,
          shortId,
          customerName: def.name,
          customerPhone: fakePhone(),
          fulfillment: def.fulfillment,
          address:
            def.fulfillment === "delivery" ? DELIVERY_ADDRESSES[0] : undefined,
          lines,
          subtotal,
          platformFee,
          sst,
          deliveryFee,
          total,
          status: "collected",
          placedAt,
          acceptedAt,
          prepMinutes: 25,
          readyAt,
          collectedAt,
          ...driverLegs,
          driver:
            def.fulfillment === "delivery"
              ? {
                  ...DRIVER_BY_INDEX[Math.abs(hashName(def.name)) % 4],
                  etaMinutes: 0,
                  assignedAt: acceptedAt,
                }
              : undefined,
          statusUpdates: [
            { at: placedAt, text: "Order received." },
            { at: acceptedAt, text: "Cooking now." },
            { at: readyAt, text: "Ready." },
            { at: collectedAt, text: "Collected." },
          ],
        };
      },
    });
  }

  // INCOMING
  for (const def of incomingDefs) {
    const placedAt = now - def.secsAgo * 1000;
    const { subtotal, platformFee, sst, deliveryFee, total } = makeTotals(
      def.items,
      def.fulfillment,
    );
    const lines = makeLines(def.items);
    const driverLegs = seedDriverLegs(def.fulfillment);
    builders.push({
      placedAt,
      build: (shortId) => ({
        id: `${prefix}-${shortId}`,
        shortId,
        customerName: def.name,
        customerPhone: fakePhone(),
        fulfillment: def.fulfillment,
        address:
          def.fulfillment === "delivery"
            ? DELIVERY_ADDRESSES[Math.abs(hashName(def.name)) % DELIVERY_ADDRESSES.length]
            : undefined,
        lines,
        note: def.note,
        subtotal,
        platformFee,
        sst,
        deliveryFee,
        total,
        status: "incoming",
        placedAt,
        ...driverLegs,
        statusUpdates: [
          {
            at: placedAt,
            text: `Order received — waiting for ${venueName} to confirm.`,
          },
        ],
      }),
    });
  }

  // COOKING
  for (const def of cookingDefs) {
    const placedAt = now - def.placedSecsAgo * 1000;
    const acceptedAt = now - def.acceptedSecsAgo * 1000;
    const { subtotal, platformFee, sst, deliveryFee, total } = makeTotals(
      def.items,
      def.fulfillment,
    );
    const lines = makeLines(def.items);
    const driverLegs = seedDriverLegs(def.fulfillment);
    builders.push({
      placedAt,
      build: (shortId) => ({
        id: `${prefix}-${shortId}`,
        shortId,
        customerName: def.name,
        customerPhone: fakePhone(),
        fulfillment: def.fulfillment,
        address:
          def.fulfillment === "delivery"
            ? DELIVERY_ADDRESSES[Math.abs(hashName(def.name)) % DELIVERY_ADDRESSES.length]
            : undefined,
        lines,
        note: def.note,
        subtotal,
        platformFee,
        sst,
        deliveryFee,
        total,
        status: "cooking",
        placedAt,
        acceptedAt,
        prepMinutes: def.prepMinutes,
        ...driverLegs,
        driver:
          def.fulfillment === "delivery"
            ? {
                ...DRIVER_BY_INDEX[Math.abs(hashName(def.name)) % 4],
                etaMinutes: def.driverEta ?? 8,
                assignedAt: acceptedAt,
              }
            : undefined,
        statusUpdates: [
          { at: placedAt, text: "Order received." },
          {
            at: acceptedAt,
            text: `Cooking now — ready in ~${def.prepMinutes} min.`,
          },
        ],
      }),
    });
  }

  // READY
  for (const def of readyDefs) {
    const placedAt = now - def.placedSecsAgo * 1000;
    const acceptedAt = now - def.acceptedSecsAgo * 1000;
    const readyAt = now - def.readySecsAgo * 1000;
    const { subtotal, platformFee, sst, deliveryFee, total } = makeTotals(
      def.items,
      def.fulfillment,
    );
    const lines = makeLines(def.items);
    const driverLegs = seedDriverLegs(def.fulfillment);
    builders.push({
      placedAt,
      build: (shortId) => ({
        id: `${prefix}-${shortId}`,
        shortId,
        customerName: def.name,
        customerPhone: fakePhone(),
        fulfillment: def.fulfillment,
        address:
          def.fulfillment === "delivery"
            ? DELIVERY_ADDRESSES[Math.abs(hashName(def.name)) % DELIVERY_ADDRESSES.length]
            : undefined,
        lines,
        subtotal,
        platformFee,
        sst,
        deliveryFee,
        total,
        status: "ready",
        placedAt,
        acceptedAt,
        prepMinutes: def.prepMinutes,
        readyAt,
        ...driverLegs,
        driver:
          def.fulfillment === "delivery"
            ? {
                ...DRIVER_BY_INDEX[Math.abs(hashName(def.name)) % 4],
                etaMinutes: def.driverEta ?? 6,
                assignedAt: acceptedAt,
              }
            : undefined,
        statusUpdates: [
          { at: placedAt, text: "Order received." },
          {
            at: acceptedAt,
            text: `Cooking now — ready in ~${def.prepMinutes} min.`,
          },
          {
            at: readyAt,
            text:
              def.fulfillment === "delivery"
                ? "Your order is ready and out for delivery."
                : "Your order is ready! Come collect it at the counter.",
          },
        ],
      }),
    });
  }

  builders.sort((a, b) => a.placedAt - b.placedAt);
  const orders = builders.map((b, i) =>
    normalizeOrder(b.build(String(i + 1).padStart(3, "0")) as Order),
  );

  // Seed a chat thread on the most-recent collected delivery order so the
  // vendor's Messages surface lands populated for the pitch. Demo data only —
  // the exchange is hand-written, not generated.
  seedFowlBoysChat(orders);

  // Seed one currently-cooking order with an unread customer message so the
  // vendor-side unread roll-up (banner + per-card chip) AND the grey-vs-blue
  // tick distinction both have something live to show in the demo. The
  // crack-fries exchange above is intentionally fully-read (past completed
  // order); this one is intentionally unread.
  seedFowlBoysUnreadCustomerMessage(orders, now);

  // History only keeps the past 7 days; live orders are always within minutes
  const cutoff = now - 7 * 24 * HOUR;
  const filtered = orders.filter((o) => o.placedAt >= cutoff);
  return { orders: filtered, nextOrderNum: filtered.length + 1 };
}

/**
 * Mutates one collected order in-place to carry the canonical
 * "out of crack fries → sub waffle fries → yes please" exchange. Picks the
 * most recent collected delivery order that actually has Crack Fries on it
 * so the conversation reads naturally to a viewer inspecting the line items.
 *
 * Both `lastReadAtVendor` and `lastReadAtCustomer` are pre-set past the
 * latest message so the seeded exchange renders as fully-read (blue double-
 * tick on every outgoing bubble) — the correct visual for a past, completed
 * order.
 */
function seedFowlBoysChat(orders: Order[]) {
  const target = orders.find(
    (o) =>
      o.status === "collected" &&
      o.fulfillment === "delivery" &&
      o.lines.some((l) => l.itemName.toLowerCase().includes("crack fries")),
  );
  if (!target || !target.acceptedAt) return;
  const t1 = target.acceptedAt + 5 * 60_000;
  const t2 = target.acceptedAt + 7 * 60_000;
  target.messages = [
    {
      id: "seed_crackfries_v",
      from: "vendor",
      text: "Hey — turns out we just ran out of crack fries. Cool to sub waffle fries (same price)? Sorry about that!",
      at: t1,
    },
    {
      id: "seed_crackfries_c",
      from: "customer",
      text: "Yes please 👍",
      at: t2,
    },
  ];
  const readMark = t2 + 60_000;
  target.lastReadAtVendor = readMark;
  target.lastReadAtCustomer = readMark;
  // Per-tab vendorLastReadAt drives the kebab badge + banner roll-up. Bump
  // it so the seeded crack-fries exchange (a completed past order) doesn't
  // contribute to the demo's live unread count — that belongs to the Sara T.
  // seed below.
  markChatRead(target.id, readMark);
}

/**
 * Mutates the cooking pickup order (Sara T. — Chicken & Waffle + Lemonade,
 * ~13 min into a 25-min prep) so it lands with one unread inbound customer
 * message. Drives the live-demo affordances:
 *  - vendor-side unread roll-up (banner aggregate + per-card chip — both
 *    sourced from the per-tab vendorLastReadAt map, which is intentionally
 *    not bumped here)
 *  - grey ✓ tick on the customer's own bubble while the vendor hasn't read
 *    yet; flips to blue ✓✓ in real-time when the vendor opens the chat
 *    sheet (via `markPartyRead("vendor")` → BroadcastChannel → other-tab
 *    re-render).
 *
 * Pickup status was chosen on purpose: cleaner card (no driver block) so
 * the unread chip + tick distinction stay visually unambiguous in the demo.
 */
function seedFowlBoysUnreadCustomerMessage(orders: Order[], now: number) {
  const target = orders.find(
    (o) =>
      o.status === "cooking" &&
      o.fulfillment === "pickup" &&
      o.customerName.startsWith("Sara"),
  );
  if (!target) return;
  const at = now - 2 * 60_000;
  target.messages = [
    {
      id: "seed_unread_sara_c",
      from: "customer",
      text: "Hey, can I add maple syrup on the side? Forgot to ask 🙏",
      at,
    },
  ];
  // Customer "saw" their own message (they sent it); vendor has NOT.
  target.lastReadAtCustomer = at + 500;
  // lastReadAtVendor intentionally left unset → grey ✓ on the customer's
  // outgoing bubble in OrderChatScreen until the vendor opens the thread.
}

// Stable name → integer hash so the same customer always lands the same driver
function hashName(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

const GENERIC_NAMES = [
  "Aisyah K.",
  "Marcus L.",
  "Priya S.",
  "Daniel R.",
  "Hafiz O.",
  "Sara T.",
  "Joey C.",
  "Wei N.",
  "Farah Z.",
  "Kiran M.",
  "Boon Family",
  "Lee J.",
];

function buildGenericSeed(venue: Venue): OrdersState {
  const now = Date.now();
  const HOUR = 3_600_000;
  const prefix = venue.orderIdPrefix;
  const venueName = venue.name;

  const flat: { name: string; price: number }[] = [];
  for (const cat of venue.menu) {
    for (const item of cat.items) {
      flat.push({ name: item.name, price: item.price });
    }
  }
  if (flat.length === 0) return empty;

  const pickItems = (seed: number, count: number): ItemDef[] => {
    const items: ItemDef[] = [];
    const used = new Set<number>();
    for (let i = 0; i < count; i++) {
      let idx = (seed * 31 + i * 17 + 7) % flat.length;
      let attempts = 0;
      while (used.has(idx) && attempts < flat.length) {
        idx = (idx + 1) % flat.length;
        attempts++;
      }
      used.add(idx);
      const f = flat[idx];
      const qty = i === 0 ? 1 : i % 2 === 0 ? 1 : 2;
      items.push({ name: f.name, qty, price: f.price });
    }
    return items;
  };

  type HistorySpec = {
    minsAgo: number;
    name: string;
    fulfillment: "delivery" | "pickup";
    seed: number;
    itemCount: number;
    status: "collected" | "rejected";
    rejectionReason?: string;
  };

  const historyDefs: HistorySpec[] = [
    { minsAgo: 95, name: GENERIC_NAMES[0], fulfillment: "delivery", seed: 0, itemCount: 3, status: "collected" },
    { minsAgo: 130, name: GENERIC_NAMES[1], fulfillment: "pickup", seed: 1, itemCount: 2, status: "collected" },
    { minsAgo: 175, name: GENERIC_NAMES[2], fulfillment: "delivery", seed: 2, itemCount: 3, status: "collected" },
    { minsAgo: 220, name: GENERIC_NAMES[3], fulfillment: "pickup", seed: 3, itemCount: 2, status: "rejected", rejectionReason: "Out of stock" },
    { minsAgo: 260, name: GENERIC_NAMES[4], fulfillment: "delivery", seed: 4, itemCount: 3, status: "collected" },
    { minsAgo: 24 * 60, name: GENERIC_NAMES[5], fulfillment: "delivery", seed: 5, itemCount: 2, status: "collected" },
    { minsAgo: 26 * 60, name: GENERIC_NAMES[6], fulfillment: "pickup", seed: 6, itemCount: 3, status: "collected" },
    { minsAgo: 28 * 60, name: GENERIC_NAMES[7], fulfillment: "delivery", seed: 7, itemCount: 3, status: "collected" },
    { minsAgo: 48 * 60, name: GENERIC_NAMES[8], fulfillment: "pickup", seed: 8, itemCount: 2, status: "collected" },
    { minsAgo: 72 * 60, name: GENERIC_NAMES[9], fulfillment: "delivery", seed: 9, itemCount: 3, status: "collected" },
  ];

  type IncomingSpec = {
    secsAgo: number;
    name: string;
    fulfillment: "delivery" | "pickup";
    seed: number;
    itemCount: number;
    note?: string;
  };

  const incomingDefs: IncomingSpec[] = [
    { secsAgo: 25, name: GENERIC_NAMES[6], fulfillment: "delivery", seed: 10, itemCount: 3 },
    { secsAgo: 70, name: GENERIC_NAMES[1], fulfillment: "pickup", seed: 11, itemCount: 2 },
    { secsAgo: 120, name: GENERIC_NAMES[0], fulfillment: "delivery", seed: 12, itemCount: 3 },
    { secsAgo: 165, name: GENERIC_NAMES[4], fulfillment: "pickup", seed: 13, itemCount: 3, note: "Extra spicy please." },
    { secsAgo: 230, name: GENERIC_NAMES[7], fulfillment: "delivery", seed: 14, itemCount: 2 },
  ];

  type CookingSpec = {
    placedSecsAgo: number;
    acceptedSecsAgo: number;
    prepMinutes: number;
    name: string;
    fulfillment: "delivery" | "pickup";
    seed: number;
    itemCount: number;
    note?: string;
    driverEta?: number;
  };

  const cookingDefs: CookingSpec[] = [
    { placedSecsAgo: 360, acceptedSecsAgo: 300, prepMinutes: 25, name: GENERIC_NAMES[3], fulfillment: "delivery", seed: 15, itemCount: 2, driverEta: 9 },
    { placedSecsAgo: 840, acceptedSecsAgo: 780, prepMinutes: 25, name: GENERIC_NAMES[5], fulfillment: "pickup", seed: 16, itemCount: 2 },
    { placedSecsAgo: 1320, acceptedSecsAgo: 1260, prepMinutes: 25, name: GENERIC_NAMES[2], fulfillment: "delivery", seed: 17, itemCount: 3, driverEta: 6 },
    { placedSecsAgo: 1740, acceptedSecsAgo: 1680, prepMinutes: 25, name: GENERIC_NAMES[10], fulfillment: "pickup", seed: 18, itemCount: 3, note: "Picking up at 7pm." },
  ];

  type ReadySpec = {
    placedSecsAgo: number;
    acceptedSecsAgo: number;
    readySecsAgo: number;
    prepMinutes: number;
    name: string;
    fulfillment: "delivery" | "pickup";
    seed: number;
    itemCount: number;
    driverEta?: number;
  };

  const readyDefs: ReadySpec[] = [
    { placedSecsAgo: 60 * 30, acceptedSecsAgo: 60 * 29, readySecsAgo: 90, prepMinutes: 25, name: GENERIC_NAMES[8], fulfillment: "pickup", seed: 19, itemCount: 2 },
    { placedSecsAgo: 60 * 32, acceptedSecsAgo: 60 * 31, readySecsAgo: 30, prepMinutes: 25, name: GENERIC_NAMES[9], fulfillment: "delivery", seed: 20, itemCount: 3, driverEta: 6 },
    { placedSecsAgo: 60 * 35, acceptedSecsAgo: 60 * 34, readySecsAgo: 240, prepMinutes: 25, name: GENERIC_NAMES[11], fulfillment: "pickup", seed: 21, itemCount: 2 },
  ];

  const localAddresses = [`Near ${venue.address.split(",")[1]?.trim() ?? venue.address}`];

  // `messages` is filled in post-build by `normalizeOrder` so the per-literal
  // build callbacks below don't have to repeat `messages: []` in each return.
  type Built = {
    placedAt: number;
    build: (shortId: string) => Omit<Order, "messages">;
  };
  const builders: Built[] = [];

  for (const def of historyDefs) {
    const placedAt = now - def.minsAgo * 60_000;
    const acceptedAt = placedAt + 90_000;
    const readyAt = acceptedAt + 22 * 60_000;
    const collectedAt = readyAt + (def.fulfillment === "delivery" ? 18 : 6) * 60_000;
    const items = pickItems(def.seed, def.itemCount);
    const { subtotal, platformFee, sst, deliveryFee, total } = makeTotals(items, def.fulfillment);
    const lines = makeLines(items);
    const driverLegs = seedDriverLegs(def.fulfillment);
    builders.push({
      placedAt,
      build: (shortId) => {
        if (def.status === "rejected") {
          return {
            id: `${prefix}-${shortId}`,
            shortId,
            customerName: def.name,
            customerPhone: fakePhone(),
            fulfillment: def.fulfillment,
            address: def.fulfillment === "delivery" ? localAddresses[0] : undefined,
            lines,
            subtotal,
            platformFee,
            sst,
            deliveryFee,
            total,
            status: "rejected",
            placedAt,
            rejectedAt: placedAt + 60_000,
            rejectionReason: def.rejectionReason ?? "Out of stock",
            refundCredit: 5,
            ...driverLegs,
            statusUpdates: [
              { at: placedAt, text: "Order received." },
              {
                at: placedAt + 60_000,
                text: `Cancelled by ${venueName} (${(def.rejectionReason ?? "out of stock").toLowerCase()}). Refunded.`,
              },
            ],
          };
        }
        return {
          id: `${prefix}-${shortId}`,
          shortId,
          customerName: def.name,
          customerPhone: fakePhone(),
          fulfillment: def.fulfillment,
          address: def.fulfillment === "delivery" ? localAddresses[0] : undefined,
          lines,
          subtotal,
          platformFee,
          sst,
          deliveryFee,
          total,
          status: "collected",
          placedAt,
          acceptedAt,
          prepMinutes: 25,
          readyAt,
          collectedAt,
          ...driverLegs,
          driver:
            def.fulfillment === "delivery"
              ? {
                  ...DRIVER_BY_INDEX[Math.abs(hashName(def.name)) % 4],
                  etaMinutes: 0,
                  assignedAt: acceptedAt,
                }
              : undefined,
          statusUpdates: [
            { at: placedAt, text: "Order received." },
            { at: acceptedAt, text: "Cooking now." },
            { at: readyAt, text: "Ready." },
            { at: collectedAt, text: "Collected." },
          ],
        };
      },
    });
  }

  for (const def of incomingDefs) {
    const placedAt = now - def.secsAgo * 1000;
    const items = pickItems(def.seed, def.itemCount);
    const { subtotal, platformFee, sst, deliveryFee, total } = makeTotals(items, def.fulfillment);
    const lines = makeLines(items);
    const driverLegs = seedDriverLegs(def.fulfillment);
    builders.push({
      placedAt,
      build: (shortId) => ({
        id: `${prefix}-${shortId}`,
        shortId,
        customerName: def.name,
        customerPhone: fakePhone(),
        fulfillment: def.fulfillment,
        address: def.fulfillment === "delivery" ? localAddresses[0] : undefined,
        lines,
        note: def.note,
        subtotal,
        platformFee,
        sst,
        deliveryFee,
        total,
        status: "incoming",
        placedAt,
        ...driverLegs,
        statusUpdates: [
          {
            at: placedAt,
            text: `Order received — waiting for ${venueName} to confirm.`,
          },
        ],
      }),
    });
  }

  for (const def of cookingDefs) {
    const placedAt = now - def.placedSecsAgo * 1000;
    const acceptedAt = now - def.acceptedSecsAgo * 1000;
    const items = pickItems(def.seed, def.itemCount);
    const { subtotal, platformFee, sst, deliveryFee, total } = makeTotals(items, def.fulfillment);
    const lines = makeLines(items);
    const driverLegs = seedDriverLegs(def.fulfillment);
    builders.push({
      placedAt,
      build: (shortId) => ({
        id: `${prefix}-${shortId}`,
        shortId,
        customerName: def.name,
        customerPhone: fakePhone(),
        fulfillment: def.fulfillment,
        address: def.fulfillment === "delivery" ? localAddresses[0] : undefined,
        lines,
        note: def.note,
        subtotal,
        platformFee,
        sst,
        deliveryFee,
        total,
        status: "cooking",
        placedAt,
        acceptedAt,
        prepMinutes: def.prepMinutes,
        ...driverLegs,
        driver:
          def.fulfillment === "delivery"
            ? {
                ...DRIVER_BY_INDEX[Math.abs(hashName(def.name)) % 4],
                etaMinutes: def.driverEta ?? 8,
                assignedAt: acceptedAt,
              }
            : undefined,
        statusUpdates: [
          { at: placedAt, text: "Order received." },
          { at: acceptedAt, text: `Cooking now — ready in ~${def.prepMinutes} min.` },
        ],
      }),
    });
  }

  for (const def of readyDefs) {
    const placedAt = now - def.placedSecsAgo * 1000;
    const acceptedAt = now - def.acceptedSecsAgo * 1000;
    const readyAt = now - def.readySecsAgo * 1000;
    const items = pickItems(def.seed, def.itemCount);
    const { subtotal, platformFee, sst, deliveryFee, total } = makeTotals(items, def.fulfillment);
    const lines = makeLines(items);
    const driverLegs = seedDriverLegs(def.fulfillment);
    builders.push({
      placedAt,
      build: (shortId) => ({
        id: `${prefix}-${shortId}`,
        shortId,
        customerName: def.name,
        customerPhone: fakePhone(),
        fulfillment: def.fulfillment,
        address: def.fulfillment === "delivery" ? localAddresses[0] : undefined,
        lines,
        subtotal,
        platformFee,
        sst,
        deliveryFee,
        total,
        status: "ready",
        placedAt,
        acceptedAt,
        prepMinutes: def.prepMinutes,
        readyAt,
        ...driverLegs,
        driver:
          def.fulfillment === "delivery"
            ? {
                ...DRIVER_BY_INDEX[Math.abs(hashName(def.name)) % 4],
                etaMinutes: def.driverEta ?? 6,
                assignedAt: acceptedAt,
              }
            : undefined,
        statusUpdates: [
          { at: placedAt, text: "Order received." },
          { at: acceptedAt, text: `Cooking now — ready in ~${def.prepMinutes} min.` },
          {
            at: readyAt,
            text:
              def.fulfillment === "delivery"
                ? "Your order is ready and out for delivery."
                : "Your order is ready! Come collect it at the counter.",
          },
        ],
      }),
    });
  }

  builders.sort((a, b) => a.placedAt - b.placedAt);
  const orders = builders.map((b, i) =>
    normalizeOrder(b.build(String(i + 1).padStart(3, "0")) as Order),
  );

  const cutoff = now - 7 * 24 * HOUR;
  const filtered = orders.filter((o) => o.placedAt >= cutoff);
  return { orders: filtered, nextOrderNum: filtered.length + 1 };
}
