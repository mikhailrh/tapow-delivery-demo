# tapow-delivery-demo

A click-through web prototype for **Tapow**, a multi-venue food delivery platform launching in Kota Kinabalu. The active venue is selected by URL slug (`/v/<slug>`); FowlBoys Diner is the default and most fully populated venue, originally built as a single-tenant pitch for The Campus, Ampang. Three perspectives in one app, swappable from a Demo controls drawer:

- **Customer** — phone (440×956). Scan QR → browse menu → cart → checkout → WhatsApp receipt with live status updates. Continuous-scroll menu with sticky category strip + scroll-spy, hero "Last order" card, saved-address picker on checkout, customer-side cancellation while incoming, downloadable tax receipt after collection, refund pill (amber → emerald).
- **Vendor** — kitchen tablet (1366×1024 landscape). Three-column kanban (INCOMING / COOKING / READY), accept/reject, store status, stock 86, history, push-back ETA, free-text messages to the customer, real refund flow, kitchen prep default editor in the store sheet.
- **Manager** — owner phone (440×956). Dashboard-shaped: revenue, avg ticket, oldest waiting, late orders, quick force-pause / push 86, end-of-day close-out. 5 tabs: Today / History / Stock / Promos / Settings.

Sister project [tapow-demo](https://github.com/mikhailrh/tapow-demo) is the bigger story (four venues + staff iPad + tabs); this one tells it on FowlBoys' own brand for an investor / vendor meeting. Single venue, no in-venue tabs, pre-paid orders only.

Fidelity > rigor — the goal is "this looks and feels like the real product on a real device." On phones / tablets the frame fills the viewport; on desktop it locks to the device-shaped box.

---

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS v3.4**, single hardcoded brand palette (no per-venue theming — there's only one venue)
- Pure SVG icons in [src/components/icons.tsx](src/components/icons.tsx)
- No router, no global state library, no animation library
- Inline Web Audio chimes (no audio assets shipped)
- BroadcastChannel + localStorage for cross-tab order sync
- Inter loaded from `rsms.me/inter/inter.css`

```sh
npm install
npm run dev    # http://localhost:5173
npm run build  # type-check + production bundle
npm run lint
```

Deploys via `vercel.json`. No backend — everything is client state, persisted in localStorage where it matters.

---

## Project structure

```
src/
├── App.tsx                          # Provider stack + perspective root + DemoControls
├── main.tsx
├── index.css                        # Tailwind + base + keyframes (slide / flash / pulse / sheetUp / drawer)
├── components/
│   ├── PhoneFrame.tsx               # variant: 'phone' (440×956) | 'tablet' (1366×1024)
│   ├── DemoControls.tsx             # right-edge pull tab → drawer with perspective + sound + seed
│   ├── UndoSnackbar.tsx             # 5-second undo toast w/ progress bar
│   ├── ReorderRail.tsx              # horizontal-scroll rail of past collected orders (currently unused; kept for reinstate)
│   └── icons.tsx                    # All SVGs
├── data/
│   └── menu.ts                      # MENU constant + types (8 categories, ~50 items, 5 heat tiers)
├── lib/
│   ├── money.ts                     # formatRM, SERVICE_CHARGE_RATE, SST_RATE, DELIVERY_FEE
│   ├── pricing.ts                   # calculateSavings(...) — Tapow vs Grab comparison
│   ├── orders.ts                    # Order / Driver / OrderStatus / Refund types + helpers (elapsedLabel, cookingAging, calculateCustomerEta, calculateOrderCustomerEta, rollDriverLegs, fakeName, …)
│   ├── receipt.ts                   # openPrintableReceipt(order, profile) — opens a new window with templated HTML, then window.print
│   ├── sound.ts                     # Web Audio: playIncomingChime / playWarningChime / playConfirmTick
│   └── sync.ts                      # BroadcastChannel + localStorage cross-tab sync helper
├── context/
│   ├── PerspectiveContext.tsx       # 'customer' | 'vendor' | 'manager', persisted per-tab
│   ├── NavContext.tsx               # customer screen stack
│   ├── VendorNavContext.tsx         # vendor screen stack
│   ├── CartContext.tsx              # in-memory cart lines + note + promoCode + subtotal + itemCount
│   ├── OrdersContext.tsx            # orders[] + actions (create / accept / markReady / markCollected / reject / cancel / pushBackEta / sendVendorMessage / issueRefund) + auto-seed
│   ├── StoreContext.tsx             # status, hours schedule, kitchenPrepMinutes, deliveryMinSubtotal + derived isOutsideHours / nextOpenLabel
│   ├── StockContext.tsx             # disabled item ids + disabled heat tiers (86 menu)
│   ├── PromoContext.tsx             # promo codes + auto-applied window deals
│   ├── VenueProfileContext.tsx      # business name / SSM / SST / address — used on tax receipts
│   ├── CustomerProfileContext.tsx   # saved delivery addresses + selected address
│   └── ClosedDaysContext.tsx        # ClosedDay records (date keyed) + isClosed / getClosed helpers
└── screens/
    ├── MenuScreen.tsx               # customer — continuous-scroll menu w/ in-list category headers + sticky strip + scroll-spy, hero w/ split-tap Last Order card, top-bar overlay (transparent → solid), calm closed-status banner
    ├── ItemScreen.tsx               # customer — options + qty, sold-out heat tiers grayed out
    ├── CartScreen.tsx               # customer — line steppers + kitchen note + promo input + checkout CTA
    ├── CheckoutScreen.tsx           # customer — delivery/pickup, two-component ETA, address picker, delivery min, creates Order
    ├── ConfirmationScreen.tsx       # customer — 1.8s splash → WhatsAppScreen with orderId
    ├── WhatsAppScreen.tsx           # customer — live chat, cancel CTA, refund pill, download receipt after collection, kitchen-message bubbles
    ├── vendor/
    │   ├── VendorApp.tsx            # nav root
    │   ├── VendorMainScreen.tsx     # 3-column kanban (lg:) / single-col w/ tabs (phone), header chip, kitchen prep default editor in store sheet
    │   ├── VendorOrderCard.tsx      # order #, customer, fulfillment pill, items, prep countdown, color aging, kebab popover (status-aware menuItems API)
    │   ├── PrepTimePickerSheet.tsx  # 15/25/45/Custom on Accept, applies busy delta
    │   ├── PushBackEtaSheet.tsx     # +5/+10/+15/Custom while in COOKING
    │   ├── RejectModal.tsx          # reason picker + Out-of-stock auto-suggest + apology credit
    │   ├── VendorHistoryScreen.tsx  # 7-day list, search, filter
    │   ├── VendorOrderDetailScreen.tsx  # full timeline + Send message sheet + real refund sheet
    │   └── VendorStockScreen.tsx    # toggle items + heat tiers off, live search
    └── manager/
        └── ManagerApp.tsx           # phone-frame dashboard: Today / History / Stock / Promos / Settings tabs + close-day + refund mirror
```

`reference/` holds the menu PDF and screenshots used to transcribe the menu — not shipped.

---

## Brand system

Single hardcoded palette in [tailwind.config.js](tailwind.config.js):

| Token | Hex | Use |
| --- | --- | --- |
| `brand-green` | `#06C167` | Primary CTA accent (matches the Tapow product green) |
| `brand-ink` | `#0A0A0A` | Primary text + dark CTAs |
| `brand-muted` | `#6B6B6B` | Secondary text |
| `brand-canvas` | `#F6F6F6` | Soft neutral chip / row backgrounds |

Outside-frame background: `#f0f0f0`. **No per-venue theming** — there's only one venue. If this scaffold is later cloned to pitch another vendor, swap the four `brand.*` tokens once and you're done.

---

## Architecture

Provider stack ([App.tsx](src/App.tsx)) — 8 providers wrapped in this order:

```
PerspectiveProvider                   // 'customer' | 'vendor' | 'manager' (per-tab, localStorage)
  OrdersProvider                      // orders[] + auto-seed on first ever visit
    StoreProvider                     // status, hours, kitchen prep, delivery min
      StockProvider                   // 86'd items + heats
        PromoProvider                 // codes + auto-promos
          VenueProfileProvider        // business name / SSM / SST / address (for tax receipts)
            CustomerProfileProvider   // saved delivery addresses
              ClosedDaysProvider      // end-of-day close-out records
                PerspectiveRoot       // picks frame variant + app
                  PhoneFrame variant=…// 'phone' (440×956) or 'tablet' (1366×1024)
                    <CustomerApp /> | <VendorApp /> | <ManagerApp />
                DemoControls          // pull tab + drawer (perspective, sound, seed/wipe)
```

The wrap order is mostly arbitrary — child contexts can read ancestors but not vice versa, and none of these read each other today. PromoProvider, VenueProfileProvider, CustomerProfileProvider, and ClosedDaysProvider are leaf-ish.

Customer and Vendor each have their own nav stack. Manager is bottom-nav controlled (no stack — just tab state).

### Perspective ([src/context/PerspectiveContext.tsx](src/context/PerspectiveContext.tsx))

`'customer' | 'vendor' | 'manager'`. Persisted in `localStorage.fowlboys.perspective`. Toggling is **per-tab** — open multiple windows to demo perspectives side-by-side. Customer and Manager use the phone frame; Vendor uses the tablet frame.

### Orders ([src/context/OrdersContext.tsx](src/context/OrdersContext.tsx))

```ts
type OrderStatus =
  | "incoming" | "cooking" | "ready" | "collected" | "rejected" | "cancelled";

type StatusUpdate = {
  at: number;
  text: string;
  fromVendor?: boolean;            // free-text from kitchen vs system event
};

type Refund = {
  amount: number;
  reason: "Out of stock" | "Late" | "Wrong order" | "Other";
  note?: string;
  status: "pending" | "processed";
  requestedAt: number;
  processedAt?: number;
};

type Order = {
  id: string; shortId: string                       // FB-### + 3-digit short
  customerName: string; customerPhone: string
  fulfillment: "delivery" | "pickup"
  address?: string
  lines: OrderLineSnapshot[]
  note?: string
  subtotal/serviceCharge/sst/deliveryFee/total: number
  promoCode?: string                                 // display label (code or auto-promo name)
  discount?: number                                  // already subtracted from total
  status: OrderStatus
  placedAt/acceptedAt?/prepMinutes?/readyAt?/collectedAt?/rejectedAt?/cancelledAt?: number
  driverPickupMinutes?/driverDeliveryMinutes?: number  // mocked at creation, never moved (delivery only)
  rejectionReason?: string
  rejectionItemId?: string
  refundCredit?: number                              // apology credit on rejection
  refund?: Refund                                    // vendor-issued refund (post-acceptance)
  driver?: Driver                                    // populated on Accept for delivery orders
  statusUpdates: StatusUpdate[]
}
```

Mutations: `createOrder` / `acceptOrder` / `markReady` / `markCollected` / `rejectOrder` / `cancelOrder` / `pushBackEta` / `sendVendorMessage` / `issueRefund` / `setStatus` / `restoreOrder` (for undo) / `resetAll` (for demo controls). All commit through a single `update(updater)` that does setState + commit.

State is canonical in localStorage (`fowlboys.orders.v1`). **Auto-seed** runs once per browser (gated by `fowlboys.everSeeded`) so first-visit Vendor/Manager land on a populated kanban — 5 incoming, 4 cooking (white → yellow → amber gradient), 3 ready, 10 historical. Wipe leaves the flag set; users can manually re-seed.

### Store ([src/context/StoreContext.tsx](src/context/StoreContext.tsx))

```ts
type StoreState = {
  status: "open" | "busy" | "paused";
  busyExtraMinutes: number;
  pausedUntil: number | null;
  closingToday: boolean;
  kitchenPrepMinutes: number;        // vendor-set default (15/20/25/35/45 presets in store sheet)
  hours: WeekHours;                  // 7-element array, index 0 = Sunday
  deliveryMinSubtotal: number;       // 0 disables
};

type DayHours = { closed: boolean; openMinutes: number; closeMinutes: number };
type WeekHours = DayHours[];
```

Derived (not persisted): `isAcceptingOrders` = `status !== "paused" && !closingToday && !isOutsideHours`. `isOutsideHours` is re-evaluated every 60s and on `focus` / `visibilitychange`. `nextOpenLabel` is a human string like `"Opens 11:00 AM"` / `"Opens tomorrow at 11:00 AM"`. `busyDelta` is the extra minutes added to default ETAs while busy.

Vendor header chip swaps between Open (green) / Busy +Xmin (amber) / Paused (red) / Closing today (gray) / Off hours (gray). Effective precedence: manual paused/busy > closingToday > outside hours > open. When Busy, the customer's checkout ETA picks up the delta. When Paused, Closing today, or outside hours, Place Order is disabled and the menu shows a calm canvas-tone banner with a clock icon.

Kitchen prep default editor lives in the store-status sheet (vendor side only). Per-order prep is set on Accept via [PrepTimePickerSheet.tsx](src/screens/vendor/PrepTimePickerSheet.tsx) and may differ from the default. Push-back ETA mutates the per-order prep, not the default.

### Stock ([src/context/StockContext.tsx](src/context/StockContext.tsx))

`{ disabledItemIds: string[]; disabledHeats: HeatLevel[] }`. Toggling on the vendor/manager Stock screen instantly:
- grays out the item on the customer menu (with `Sold out` badge, click disabled)
- grays out the heat tier on ItemScreen (radio disabled, label struck through)

When a Reject flow picks "Out of stock" + an item, that item's id is auto-toggled into `disabledItemIds`. Both Vendor and Manager stock screens have a sticky search input.

### Promotions ([src/context/PromoContext.tsx](src/context/PromoContext.tsx))

```ts
type Promo = {
  id: string;
  code?: string;            // when set: customer enters at cart. Unset: auto-applied within window.
  label: string;
  type: "percent" | "flat";
  value: number;            // 10 = 10% or RM10
  minSubtotal?: number;
  expiry?: number;          // ms timestamp
  oneTimeUse?: boolean;
  window?: { days: number[]; startMinutes: number; endMinutes: number };
  active: boolean;
};
```

Default seed: Lunch deal (12–2 PM, 10% off), Happy hour (5 PM–close, RM5 off, min RM30), `SHAQ20` (20% off code), `FOWL10` (RM10 off, min RM40, 14-day expiry). Manager Promos tab toggles + adds + removes via "Add code" sheet. The cart input takes precedence over auto-promos; otherwise the highest-discounting active auto-promo applies. Discount subtracts from total **after** service charge / SST / delivery — keeps the SST math stable and the receipt rows easy to read.

### Venue profile ([src/context/VenueProfileContext.tsx](src/context/VenueProfileContext.tsx))

`{ businessName, ssmNumber, sstRegistrationNumber, address }` — used by the printable tax receipt. SST line on the receipt is conditional on `sstRegistrationNumber` being non-empty (Malaysian rule: only SST-registered businesses charge SST). Edited from Manager Settings → Business details.

### Customer profile ([src/context/CustomerProfileContext.tsx](src/context/CustomerProfileContext.tsx))

`{ addresses: SavedAddress[], selectedAddressId }`. Seeded with Home + Office. Driver instructions (gate code, unit number) are an optional per-address field. Single global profile — no real customer identity in this demo; production would key by phone number, that's a Cas problem.

### Closed days ([src/context/ClosedDaysContext.tsx](src/context/ClosedDaysContext.tsx))

`ClosedDay[]` keyed by local date `YYYY-MM-DD`. Each record snapshots `orderCount`, `revenue`, `refundsTotal`, `netRevenue`, top-3 items at close time. Manager Today tab unlocks "Close day" only after the day's scheduled close time.

### Cross-tab sync ([src/lib/sync.ts](src/lib/sync.ts))

Single `BroadcastChannel("fowlboys-sync")` per tab. Every persisted context — Orders, Store, Stock, Promo, VenueProfile, CustomerProfile, ClosedDays — funnels writes through `saveJSON(KEY, …)` which does `localStorage.setItem(key, …)` then `channel.postMessage({key})`. Other tabs' `subscribeToKey(key, listener)` hooks re-read localStorage and `setState`. BroadcastChannel doesn't echo to the originating context, so we don't loop on local writes. A `storage` event listener handles older Safari fallback. Each context owns its own `KEY` constant.

---

## Data model — `MenuItem`

Transcribed from FowlBoys' real menu. ~50 items across 8 categories:

```
Fried Chicken · All-Day Breakfast · Sandwiches · Plates ·
Pasta · For Sharing · Drinks · Milkshakes · Dessert
```

```ts
type MenuItem = {
  id: string; name: string; description?: string
  price: number               // base / starting price
  combo?: boolean             // requires heat + dip + side (fried chicken)
  heatOnly?: boolean          // requires heat only (most sandwiches)
  sizes?: SizeVariant[]       // 2/3 piece bone-in, 3/5 tenders, 2/4 wings
  addons?: OptionalAddon[]    // e.g. "Add boneless fried chicken thigh +RM8" on pasta
  badge?: string              // "Signature" pill next to the name
  image?: string              // absolute /images/... path
}
```

**Heat tiers** ([src/data/menu.ts](src/data/menu.ts)): `Neat / Mild / Hot / Xtra Hot / XX Hot`. The two top tiers carry a **per-piece** upcharge of RM2.50 (so 3 pieces of XX Hot bone-in = +RM7.50, not +RM2.50). The item screen multiplies upcharge by `size.pieces ?? 1`.

**Validation** in [ItemScreen.tsx](src/screens/ItemScreen.tsx):
- combo items require heat + dip + side
- heatOnly items require heat
- everything else has no required choices

Currently only one item has imagery: `Bone In` uses `/images/off-the-hook.jpeg` (placeholder borrowed from the Off The Hook sandwich photo shoot). All other items render a tall white space at the top — by design until real photography lands.

---

## Money

Single source of truth in [src/lib/money.ts](src/lib/money.ts):

```
Service charge   10%   (Malaysian F&B, restaurant-set, not a tax)
SST               6%   (Sales & Service Tax — note: 6%, not 8%
                        as in the multi-venue tapow-demo)
Delivery fee   RM5     (waived on pickup)
```

**No customer-facing platform fee** — pilot decision. Tapow's revenue lives outside what FowlBoys collects from the customer, and surfacing a platform fee in the demo would have made the savings line awkward.

`formatRM(n)` → `"RM39.00"` (always 2dp, no thousand separators).

Checkout shows all rows individually plus a `Discount · {label}` line when a promo is applied. The WhatsApp receipt mirrors the same breakdown inside the chat bubble. Vendor + manager order detail screens show the same totals.

### Customer ETA (two-component model)

Customer-facing ETA = kitchen prep + driver legs (delivery only):

```
Pickup:    kitchenPrep
Delivery:  kitchenPrep + driverPickupMinutes + driverDeliveryMinutes
```

Driver legs are **mocked at order creation** by `rollDriverLegs()` and frozen onto the Order:
- pickup leg: 5–10 min (driver from depot to FowlBoys)
- delivery leg: 10–20 min (driver to customer)

Once stored they don't move — keeps timer logic stable and the customer's quoted ETA honest. Pre-creation (i.e. at checkout, before an order exists), `calculateCustomerEta` falls back to the midpoint of each range so the estimate doesn't drift far from what'll be rolled.

Vendor cards still show **kitchen prep only** — the kitchen owns it. Card aging (`cookingAging`) runs against `prepMinutes`, not the customer total. Driver legs surface in the existing driver block on delivery cards. Customer status updates progressively reveal the real numbers (`"Order accepted, kitchen working on it (~25 min). Total ETA to your door ~47 min."` → `"Food's ready, driver collecting now (~7 min). They'll be at your door in ~15 min after that."` → `"Delivered."`).

Push-back ETA mutates per-order kitchen prep; the customer's total ETA recalculates and a new "running X late" status update goes out (delivery copy includes the new total ETA, pickup copy includes the new pickup ETA).

### Savings line (the punchline)

[src/lib/pricing.ts](src/lib/pricing.ts) computes `calculateSavings(subtotal, tapowDelivery, tapowService)` — a WhatsApp bubble shows `(Psst! You saved RMx vs the big delivery apps today 👏🏼)`. Assumptions: 20% Grab vendor markup, 10% Grab service rate, RM8.99 Grab delivery. **Sales narrative, not a verified number** — easy to swap if FowlBoys pushes back. The 20% markup is the load-bearing assumption.

---

## Customer flow

1. **MenuScreen** — single continuous scroll, UberEats-style: in-list bold category headers ("Fried Chicken" etc.) AND a sticky strip coexist as redundant signposts. Layered as: an absolute top bar (hamburger / centered title / search) that's transparent + title hidden over the hero before scroll, then solid white + title visible after scroll (threshold = `scrollTop > 30`); a hero block (FowlBoys name, address + prep range, full-width Last Order card if any past collected orders exist, calm canvas-tone closed-status banner with clock icon when paused / closing today / outside hours); a sticky category strip pinned at `top: 48` (clears the top bar — the user-facing "top: 0" intent is honored as "right below the top bar"); then all menu categories rendered continuously, separated by canvas-tone divider strips, each with an in-list `<h3>` header above its items. Scroll-spy: as the user scrolls, `onScroll` finds the last category whose `offsetTop ≤ scrollTop + 100` and marks it active in the strip — i.e. the section whose header is closest to the top of the visible content area becomes the active tab. Tap a tab → `scrollTo({ top: section.offsetTop - 88, behavior: 'smooth' })`. Sold-out items grayed out + struck through. **Last Order card** has two tap zones: the right-side "Reorder" button (with rotation arrow) directly reorders the most recent collected order; the rest of the card opens a bottom sheet of the last 5 collected orders for picking. The label is dynamic — "LAST ORDER" with no chevron when there's exactly 1 past order (the whole card is then a single-action reorder), "PAST ORDERS" with a chevron-down icon on the left when there are 2+. The summary line below always shows the most recent collected order. Reorder drops 86'd / removed items with a toast and navigates to cart.
2. **ItemScreen** — options + qty. Sold-out heat tiers disabled.
3. **CartScreen** — line steppers + kitchen note + promo code input. Auto-promo banner appears when one's live; user-entered codes override. Estimated total reflects discount.
4. **CheckoutScreen** — Delivery/Pickup. Two-component ETA (kitchen + driver legs). Saved-address picker (Home / Office / Add new) on the address row. Place Order disabled with `Add RMx more for delivery` if subtotal under min, or with closed-reason text otherwise.
5. **ConfirmationScreen** — 1.8s splash → WhatsAppScreen with the same `orderId`.
6. **WhatsAppScreen** — reads order live from `OrdersContext.getById(orderId)`. Receipt bubble first (with ETA pill); subsequent bubbles reveal as `statusUpdates` grow. **Cancel order** pill appears while status is `incoming` → confirm sheet → status flips to `cancelled`. **Download receipt** appears after collection → opens a printable HTML window from [src/lib/receipt.ts](src/lib/receipt.ts) using the venue profile (SST line conditional on registration). Vendor messages render as cream "FowlBoys kitchen" bubbles. Refund pill flips amber (pending) → emerald (processed) after a 2s mock delay.

---

## Vendor flow ([src/screens/vendor/](src/screens/vendor/))

**VendorMainScreen** — three-column kanban on `lg:` (>=1024px viewport). Single column with top tab bar on phone. Header chip toggles store status (Open / Busy +Xmin / Paused / Closing today / Off hours) via a bottom sheet. The same sheet has a **Kitchen prep default** editor (15 / 20 / 25 / 35 / 45 min presets) — this feeds the customer's checkout ETA estimate before an order is accepted. Snapshot banner is **operational only**: today's order count, pending counts, current store status. Revenue is intentionally absent — that's the manager's view.

**VendorOrderCard** — order #, customer, fulfillment pill, elapsed timer + kebab popover (status-aware via `menuItems` prop). Items list with size/heat/dip/side/addons. Customer note in italic if present. Driver block (initials, ETA, tap-to-call, tap-to-WhatsApp) on delivery cards in COOKING/READY. Address line on delivery cards in INCOMING. Cancelled cards render a red "Cancelled by customer" overlay for ~3s before falling out of the kanban.

**Card aging** — when a card is in COOKING the bg color escalates with `cookingAging(order, now)` = elapsed / prepMinutes:
- 0–0.8: white
- 0.8–1.0: yellow tint
- 1.0–1.2: amber
- 1.2+: red w/ slow `prepBreachPulse` animation

A live `m:ss` prep countdown sits next to the WhatsApp icon in the footer; turns red and flips to `+m:ss` overdue.

**Kebab popover** uses a generic `menuItems[]` API (`{ label, tone?, onClick }[]`) so each column can present its own options:
- **INCOMING**: `[{ label: "Reject order", tone: "destructive" }]` → [RejectModal.tsx](src/screens/vendor/RejectModal.tsx) (reason picker + Out-of-stock auto-suggests items from the order + 0/RM5/RM10 apology credit).
- **COOKING**: `[{ label: "Push back ETA" }]` → [PushBackEtaSheet.tsx](src/screens/vendor/PushBackEtaSheet.tsx) (+5/+10/+15/Custom). Updates per-order `prepMinutes`, customer gets a "running X late" WhatsApp.
- **READY**: no kebab. Primary action is "Customer arrived" / "Driver collected".

**5-second undo** ([src/components/UndoSnackbar.tsx](src/components/UndoSnackbar.tsx)) on Accept / Mark Ready / Mark Collected / Reject / Push-back. Captures a snapshot of the order before mutation, restores via `OrdersContext.restoreOrder(snapshot)` if Undo is tapped before the timer expires.

**Sound** — opt-in toggle in Demo controls. New incoming orders play a two-note A5→E6 chime ([src/lib/sound.ts](src/lib/sound.ts)) and the card flashes green for 900ms (`cardFlash` keyframe).

**VendorOrderDetailScreen** — customer block, items, totals (with discount line if applicable), customer note, full timeline (vendor messages tagged "Kitchen"), refund block if one exists. **Send message** button → sheet with 4 quick replies + free text → status update with `fromVendor: true`. **Issue refund** button → sheet (amount editable / default full / "Full" shortcut, reason picker, free-text on "Other"). Refund eligibility: cooking / ready / collected only. Hidden on incoming, rejected (auto-refunded by Billplz in production), cancelled (likewise), and rejected-with-apology-credit. Refund record flips status pending → processed after a 2s mock delay.

**VendorHistoryScreen** — 7-day order list with search + status filter (all / delivered / rejected). Cancelled orders show a red "Cancelled" pill.

**VendorStockScreen** — menu of all 50 items + 5 heat tiers with toggles + live search.

---

## Manager flow ([src/screens/manager/ManagerApp.tsx](src/screens/manager/ManagerApp.tsx))

Phone-frame dashboard with 5 bottom-nav tabs:

**Today** (default) — Greeting line that swaps with state ("All quiet" / "Things are busy" / "Someone's running late" / "You're paused" / "You're closed for the day"). Big revenue card with orders + avg ticket. Live status box: store-status pill + three count chips (Incoming / Cooking / Ready) + oldest waiting card + late-orders alert. Quick actions: force-pause (30 min) / force-reopen / push 86 update. **Close day** CTA appears on the revenue card after today's scheduled close time → summary sheet (orders / revenue / refunds / net / top 3 items) → `ClosedDay` record persists; today shows a "Day closed" pill from then on.

**History** — 7-day list with today vs 7-day revenue cards at the top. Tap a row → bottom sheet with line items + same refund flow as vendor detail. Closed-day rows get a small "Day closed" pill.

**Stock** — same toggles as the vendor stock screen, surfaced to the owner. Live search.

**Promos** — Active deals (auto-promos, toggleable) + Promo codes (codes, toggle / remove / "Add code" sheet creating new code with type / value / min subtotal). "Reset to demo defaults" wipes back to the seed.

**Settings** — Business details (name / SSM / SST / address) for tax receipts. Operating hours (per-day open/close + closed toggle, native `<input type="time">`). Delivery minimum subtotal. Production-only stuff (payouts, staff, integrations) is acknowledged at the bottom as out-of-scope.

The split mirrors Tapow Venues: vendor *operates*, manager *oversees*. Same data, different lens.

---

## Demo controls ([src/components/DemoControls.tsx](src/components/DemoControls.tsx))

Pill tab on the right edge of the viewport pulls out a drawer:

- **Perspective** — Customer / Vendor / Manager (stacked rows with sub-labels). Switching swaps the frame variant and the app.
- **Sound** — toggle vendor chimes (default off; the toggle interaction unlocks the AudioContext).
- **Demo data** — Orders in system / Incoming / Store status. **Seed history** rebuilds the kanban + history (always overwrites). **Wipe all orders** zeros out (auto-seed flag stays set so it doesn't immediately re-populate).

---

## PhoneFrame & mobile viewport

[src/components/PhoneFrame.tsx](src/components/PhoneFrame.tsx). Variant prop:
- `'phone'` → `max-w-[440px] max-h-[956px]`, 48px corner radius (Customer + Manager)
- `'tablet'` → `max-w-[1366px] max-h-[1024px]`, 36px corner radius (Vendor)

On phones / tablets the frame fills the viewport. On desktop it locks to the device-shaped box with rounded corners + drop shadow.

**`dvh` everywhere, never `vh`.** Three layers must agree: `html / body / #root` (`height: 100dvh` in [index.css](src/index.css)), the outer wrapper (`h-dvh`), and the inner frame (`height: 100dvh`). On iOS Safari, `100vh` resolves to the *largest* viewport, creating a grey gap on top of the frame and pushing the bottom CTA off-screen as the URL bar shows/hides.

`pb-28` / `pb-32` / `pb-36` on scroll containers gives sticky bottom CTAs room to overlay. Bottom CTAs use `absolute bottom-0` inside `relative flex-1 flex flex-col` containers.

---

## lib helpers

- [src/lib/money.ts](src/lib/money.ts) — `formatRM` + `SERVICE_CHARGE_RATE` / `SST_RATE` / `DELIVERY_FEE` constants.
- [src/lib/pricing.ts](src/lib/pricing.ts) — `calculateSavings(subtotal, tapowDelivery, tapowService)`.
- [src/lib/orders.ts](src/lib/orders.ts) — `Order` / `Driver` / `OrderStatus` / `Refund` / `RefundReason` types. Helpers: `elapsedLabel`, `cookingAging`, `digitsOnly`, `fakeName`, `fakePhone`, `pickDriver`, `snapshotLines`, `rollDriverLegs` (random pickup 5–10 / delivery 10–20), `calculateCustomerEta({ fulfillment, kitchenMinutes, driverPickupMinutes?, driverDeliveryMinutes? })` (midpoints used when legs absent — pre-creation checkout), `calculateOrderCustomerEta(order, defaultKitchenPrep)`.
- [src/lib/receipt.ts](src/lib/receipt.ts) — `openPrintableReceipt(order, profile)` opens a new window with templated HTML, then `window.print()` after a 100ms defer. SST line is conditional on `profile.sstRegistrationNumber`. Footer carries both FowlBoys and Tapow names.
- [src/lib/sound.ts](src/lib/sound.ts) — Web Audio chimes.
- [src/lib/sync.ts](src/lib/sync.ts) — cross-tab sync helpers.

---

## Known gaps / next sessions

Removed (now built): real refund flow, address picker, customer cancellation, push-back ETA, vendor → customer messaging, operating hours and schedule, end-of-day close-out, tax receipt with venue-controlled tax info, delivery minimum, promotions, two-component ETA model, kitchen prep default editor.

Still gaps:
1. **Real photography.** Only `Bone In` has an image. Every other item screen renders a tall white block. Replace `MenuItem.image` paths when FowlBoys provides shots.
2. **Real Billplz** behind Place Order. `Card •••• 4242` is a placeholder.
3. **Real WhatsApp Business API** for the receipt + status updates. The customer's chat is mocked.
4. **Real Lalamove** for driver dispatch. Currently faked at Accept time with one of four pool drivers; the two driver legs are mocked at order creation with fixed random ranges.
5. **Tablet heartbeat** — described in the brief, not built. Production: if vendor app hasn't pinged in 5 min → auto-paused + WhatsApp alert to owner.
6. **Multi-staff roles** — deliberate skip. Phase 2 if Shaq asks.
7. **Delivery geo radius** — deliberate skip. Phase 2.
8. **Tipping** — deliberate skip. Phase 2.
9. **Persistence beyond demo** — Cart is in-memory; orders/store/stock/promos/profiles/closed-days are in localStorage. A real build would have a backend. Deliberate for the prototype.
10. **Real customer identity.** Saved-address context is a single global profile; production keys by phone number. Reorder rail / pill is global for the same reason.
11. **Manager analytics + multi-location.** Out of scope. Charts in Settings are placeholders. Multi-location too (defer until they open a second venue).

---

## Style notes

- Default to writing **no comments**. Add one only when the WHY is non-obvious — a hidden constraint, a workaround, behavior that would surprise a reader.
- **Emoji-free in code and text** unless the user asks. The emoji in `WhatsAppScreen.tsx` (🐔, 👏🏼) and Manager copy are deliberate — fake WhatsApp bubble copy and dashboard greetings respectively.
- **`dvh` always, `vh` never** for full-height mobile layouts.
- **`pointer-events-none`** on any non-interactive element that overlaps an interactive one (negative-margin layouts especially). Avoid stacking absolute-positioned controls over flex content — prefer inline placement.
- **Closed status banner is informational, not an error.** Use canvas + ink tone with a clock icon, not red.
- Markdown links use relative paths from repo root: `[icons.tsx](src/components/icons.tsx)`, not bare paths or backticks.
- Lint is strict (React 19 hooks rules) and has pre-existing failures in context files (`react-refresh/only-export-components`). Build (`tsc -b && vite build`) is the source of truth, not `npm run lint`.

---

## Multi-venue refactor — Pass 1

Forked from the single-tenant FowlBoys × Tapow pitch demo. Pass 1 makes the app venue-aware via URL slug; menu, payments, auth, and backend remain untouched.

### What changed

- **[src/data/venues/index.ts](src/data/venues/index.ts)** — new `Venue` type + `VENUES` record + `resolveVenue(slug)` resolver. Two venues seeded: `fowlboys` (the original, full data) and `noko-noko` (placeholder with distinct name, address, brand colors, and `NN-` order prefix). Each venue carries `slug`, `name`, `tagline`, `address`, `ssm`, `sstRegistrationNumber`, `brandTokens`, `orderIdPrefix`, `kitchenPrepDefaultMinutes`, `deliveryMinSubtotal`, `hours`, and `menu`. `WeekHours` / `DayHours` types moved here from StoreContext (StoreContext re-exports for callers).
- **[src/context/VenueContext.tsx](src/context/VenueContext.tsx)** — new `<VenueProvider>` reads slug from `window.location.pathname` (`/v/<slug>`), resolves against `VENUES` (fallback to `fowlboys`), and on mount synchronously (a) registers the slug with `sync.ts` and (b) writes brand tokens to `:root` as CSS custom properties. Added at the top of the provider stack so all downstream contexts can `useVenue()`.
- **[tailwind.config.js](tailwind.config.js)** — `brand.green/ink/muted/canvas` are now `var(--brand-*)` instead of hex literals. Default values live in [src/index.css](src/index.css) under `:root` (FowlBoys palette) so initial render before VenueProvider mounts still looks right.
- **[src/lib/sync.ts](src/lib/sync.ts)** — venue-aware. Module-level `activeSlug` (default `fowlboys`); `setActiveVenueSlug(slug)` rebuilds the BroadcastChannel as `tapow-${slug}-sync` and is called by VenueProvider during render. `loadJSON` / `saveJSON` / `subscribeToKey` accept short suffixes (e.g. `"orders.v1"`) and prefix them with `tapow.${slug}.` automatically. New `scopedKey(suffix)` helper exported for non-JSON localStorage callers (perspective, sound).
- **All localStorage keys** went from `fowlboys.<thing>.v1` to `tapow.<slug>.<thing>.v1`. Auto-seed flag is now scoped per venue, so each venue auto-populates its kanban on first visit independently.
- **VenueProfileContext, StoreContext** — initial state now seeded from the active venue (business name / SSM / SST / address; kitchen prep default; delivery min; hours). Persisted overrides still win.
- **OrdersContext** — order IDs use `${venue.orderIdPrefix}-###` instead of hardcoded `FB-`. Customer-facing status strings (`"Order received — waiting for ${venue.name} to confirm."`, `"Delivered — enjoy! Thanks for ordering with ${venue.name}"`, etc.) and seed history reference `venue.name`.
- **Receipt template** — footer reads `${profile.businessName} and Tapow`.
- **Screens** with hardcoded "FowlBoys Diner" copy now read `useVenue()` and render `venue.name` / `venue.address`: MenuScreen hero + sticky title, CartScreen header, CheckoutScreen close-status reasons + pickup label, WhatsAppScreen vendor-bubble label, VendorMainScreen header + monogram, VendorOrderCard WhatsApp template, ManagerApp greeting + Settings business-name placeholder.

### Smoke-test it

`npm run dev`, open `/v/fowlboys` (looks identical to before), then `/v/noko-noko` in another tab — different name, address, blue brand color, separate order kanban, no state bleed. `/` and `/v/<unknown-slug>` fall back to FowlBoys.

### Next pass — menu schema refactor

The `MenuItem` shape ([src/data/menu.ts](src/data/menu.ts)) is FowlBoys-specific — `combo` (heat + dip + side), `heatOnly` (sandwich heat picker), `sizes` (bone-in / tenders / wings piece counts), per-piece heat upcharges, and a global `HEAT_LEVELS / DIPS / SIDES` enum. Both venues currently share this menu as a placeholder; noko-noko will need its own items. Pass 2 generalizes the menu so any venue can express its modifier groups (heat, sauce, size, doneness, custom add-on lists) without baking FowlBoys assumptions into the schema or into ItemScreen / CartScreen / VendorOrderCard rendering. Likely shape: `MenuItem.modifierGroups: ModifierGroup[]` where each group has `{ id, label, required, multi?, max?, options: { id, label, priceDelta }[] }`. ItemScreen validation, cart line snapshots, and stock toggles all need to swap their FowlBoys-shaped reads for the generic shape.

---

## Discovery homepage — Pass 2

Tapow is WhatsApp-native: customers tap a link or scan a QR to land on this app inside WhatsApp's in-app browser. Pass 2 adds the discovery homepage at `/` so the deep links don't all go straight to a single venue's menu.

### What changed

- **Routing** — [src/App.tsx](src/App.tsx) now branches on `window.location.pathname`. Anything matching `/v/<slug>` mounts the existing venue tree (VenueProvider + nested contexts + perspective-aware frame + DemoControls). Anything else renders `<DiscoveryScreen />` inside a phone-variant `<PhoneFrame />` — no perspective, no orders/store/etc. providers, because discovery is purely a customer browse surface and reads cross-venue order data straight from localStorage.
- **Venue catalog** — [src/data/venues/index.ts](src/data/venues/index.ts) gained 10 KK placeholder venues (Alu Alu Kitchen, Welcome Seafood, Upperstar, Suang Tian, Chilli Vanilla, Little Italy KK, Kohinoor, Biru Biru Cafe, El Centro, Octoverse Coffee) plus discovery-card metadata on every venue: `cuisine`, `priceTier` (1–3), `rating`, `ratingCount`, `estimatedDeliveryMinutes` (a tuple), `deliveryFee`, `heroImage` (Unsplash with stable photo IDs), `isOpen`, optional `hasOffer`. Noko Noko was recast as an agave bar in Plaza Damansara to match Tapow's actual launch list. Only FowlBoys has a populated `menu`; the rest carry `menu: []`.
- **[src/screens/discovery/DiscoveryScreen.tsx](src/screens/discovery/DiscoveryScreen.tsx)** — phone-frame discovery layout (top to bottom): location bar (Deliver now / Home + bell), search-bar trigger, Delivery/Pickup tabs (Pickup is visual-only), filter-chip row (Sort by, Under 30 min — actually filters, Under RM3.00, Offers — actually filters, Filters), cuisine tile row (10 emoji tiles, ordered to surface populated cuisines first; tapping toggles a filter on the list below), hero category cards (Near Me / Top Rated / Free Delivery / New on Tapow — visual only), Tapow promo banner ("Free delivery on your first order"), conditional Order Again rail, and the restaurant list. Restaurant cards show hero image with optional offer pill, name, star rating + cuisine + price tier, ETA + delivery fee. Closed venues are dimmed with a "Currently closed" overlay and pushed to the bottom of the list.
- **Order Again rail** — reads `tapow.<slug>.orders.v1` from localStorage for every venue in `VENUES`, surfaces ones with at least one collected order, sorted by most recent. Renders as a horizontal scroll of restaurant tiles with relative-time labels ("Last ordered 2d ago"). Hidden when there are no past orders anywhere. Cross-venue is intentional: discovery is a global customer surface, not scoped to one venue.
- **[src/screens/discovery/SearchOverlay.tsx](src/screens/discovery/SearchOverlay.tsx)** — full-screen overlay opened from the top search bar or the bottom search bar. Case-insensitive substring match against venue names, taglines, cuisines, and (for venues with menus) item names. Results are split into Restaurants and Dishes sections. Tapping any row navigates to `/v/<slug>` (full-page). Empty state shows popular searches.
- **Bottom-floating search bar** — Uber Eats-style sticky bottom rail inside the phone frame: home + pin + centered search input + cart + profile, only the search field is wired (opens the overlay).
- **Brand tokens on discovery** — `:root` in [src/index.css](src/index.css) holds Tapow's palette as the default (green primary, same as FowlBoys). `<VenueProvider>` overrides to the active venue's tokens on /v/<slug>; on / there's no VenueProvider so the defaults stand. Navigation between discovery and venue is full-page (`window.location.assign`), so brand transitions are clean — no SPA token-resetting logic needed.
- **Empty-menu fallback** — [src/screens/MenuScreen.tsx](src/screens/MenuScreen.tsx) checks `venue.menu.length === 0` and renders a `ComingSoon` placeholder for every non-FowlBoys venue (back chevron, "Menu coming soon" copy, and a "Browse other restaurants" button that returns to /). FowlBoys' menu and the existing customer flow are unchanged.
- **New icons** — [src/components/icons.tsx](src/components/icons.tsx) gained `HomeIcon`, `UserIcon`, `StarIcon` (filled), `FilterIcon`, `SortIcon`, `ShoppingBagIcon`, `TagIcon`.

### Smoke test

`npm run dev`, hit `/` — discovery homepage with 12 restaurants, cuisine filtering, search overlay, tappable cards. Tap FowlBoys → existing menu flow. Tap any other restaurant → "Menu coming soon" with a back link. Brand colors stay Tapow-green on discovery and switch to the venue's palette on /v/<slug>.

### Out of scope for this pass (and why)

- **Real menus for the new venues** — explicitly deferred until the menu schema refactor (next pass). Adding 10 FowlBoys-shaped menus would lock us into the FowlBoys schema for venues whose modifiers don't fit it (cocktails, coffee, indian thali sets).
- **SPA navigation between discovery and venue** — full-page reload is simpler and the WhatsApp in-app browser handles it fine. Each route owns its provider tree.
- **A real cart icon badge in the bottom search bar** — discovery has no global cart; cart is scoped per venue. Showing a count would require summing across venue carts, which doesn't match the data model.
- **Geo / pickup / sort by** — visual scaffolding only. The brief explicitly said placeholder where needed.

### Next pass

Menu schema refactor (per Pass 1's "Next pass" plan). Once that lands, the 10 placeholder venues can each get their own dishes and the "Menu coming soon" gate goes away.
