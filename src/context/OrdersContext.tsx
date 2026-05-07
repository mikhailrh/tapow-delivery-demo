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
  type OrderStatus,
  type RefundReason,
} from "../lib/orders";
import { useVenue } from "./VenueContext";
import type { Venue } from "../data/venues";

const KEY = "orders.v1";
const SEED_FLAG_SUFFIX = "everSeeded";

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
  serviceCharge: number;
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
  /** Free-text message from the kitchen to the customer. */
  sendVendorMessage: (id: string, text: string) => void;
  /** Issue a partial/full refund. Status flips pending → processed after a 2s mock delay. */
  issueRefund: (
    id: string,
    amount: number,
    reason: RefundReason,
    note?: string,
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

function read(): OrdersState {
  return loadJSON(KEY, empty);
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
          serviceCharge: input.serviceCharge,
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

  const sendVendorMessage = useCallback<
    OrdersContextValue["sendVendorMessage"]
  >(
    (id, text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      update((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== id) return o;
          return {
            ...o,
            statusUpdates: [
              ...o.statusUpdates,
              { at: Date.now(), text: trimmed, fromVendor: true },
            ],
          };
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
                fromVendor: true,
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
      issueRefund,
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
      issueRefund,
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

const SERVICE = 0.1;
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
    addons: [] as string[],
    quantity: i.qty,
    unitPrice: i.price,
    ...(i.choices?.[0] ? { size: i.choices[0] } : {}),
    ...(i.choices?.[1] ? { heat: i.choices[1] } : {}),
    ...(i.choices?.[2] ? { dip: i.choices[2] } : {}),
    ...(i.choices?.[3] ? { side: i.choices[3] } : {}),
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
  const service = subtotal * SERVICE;
  const sst = subtotal * SST;
  const deliveryFee = fulfillment === "delivery" ? 5 : 0;
  const total = subtotal + service + sst + deliveryFee;
  return { subtotal, service, sst, deliveryFee, total };
}

function buildSeedHistory(venue: Venue): OrdersState {
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
  type Built = { placedAt: number; build: (shortId: string) => Order };
  const builders: Built[] = [];

  // History (terminal)
  for (const def of historyDefs) {
    const placedAt = now - def.minsAgo * 60_000;
    const acceptedAt = placedAt + 90_000;
    const readyAt = acceptedAt + 22 * 60_000;
    const collectedAt =
      readyAt + (def.fulfillment === "delivery" ? 18 : 6) * 60_000;
    const { subtotal, service, sst, deliveryFee, total } = makeTotals(
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
            serviceCharge: service,
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
          serviceCharge: service,
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
    const { subtotal, service, sst, deliveryFee, total } = makeTotals(
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
        serviceCharge: service,
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
    const { subtotal, service, sst, deliveryFee, total } = makeTotals(
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
        serviceCharge: service,
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
    const { subtotal, service, sst, deliveryFee, total } = makeTotals(
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
        serviceCharge: service,
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
    b.build(String(i + 1).padStart(3, "0")),
  );

  // History only keeps the past 7 days; live orders are always within minutes
  const cutoff = now - 7 * 24 * HOUR;
  const filtered = orders.filter((o) => o.placedAt >= cutoff);
  return { orders: filtered, nextOrderNum: filtered.length + 1 };
}

// Stable name → integer hash so the same customer always lands the same driver
function hashName(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
