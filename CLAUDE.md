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

Default seed: Lunch deal (12–2 PM, 10% off), Happy hour (5 PM–close, RM5 off, min RM30), `SHAQ20` (20% off code), `FOWL10` (RM10 off, min RM40, 14-day expiry). Manager Promos tab toggles + adds + removes via "Add code" sheet. The cart input takes precedence over auto-promos; otherwise the highest-discounting active auto-promo applies. Discount subtracts from total **after** platform fee / SST / delivery — keeps the SST math stable and the receipt rows easy to read.

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

FowlBoys' `Bone In` uses `/images/off-the-hook.jpeg`. Goojiburg's smashburger + chicken-burger heroes use Unsplash placeholder URLs. Bar Abong has four real shots on disk under `public/images/bar-abong/` (`local-sole.jpg`, `fish-sandwich.jpg`, `stingray-sambal.jpg`, `jicama-squid-ball.jpg`) wired onto those four items and the venue hero (Local Sole). Every other item renders a tall white space at the top — by design until real photography lands.

---

## Money

Single source of truth in [src/lib/money.ts](src/lib/money.ts):

```
Platform fee     1%    (Tapow, customer-facing)
SST              6%    (Sales & Service Tax — note: 6%, not 8%
                        as in the multi-venue tapow-demo)
Delivery fee   RM5     (waived on pickup)
```

**Two fees, two surfaces:** the customer sees only the 1% **platform fee**. The 10% you'll see in pitch decks is Tapow's **commission on the vendor** — vendor-side accounting only, deducted from the vendor's payout, **never surfaced on the customer's summary or receipt**. The demo currently does not model the vendor commission anywhere on screen; if a "your payout = order total − Tapow commission" view is needed on the vendor surface, that's a separate build.

The persisted Order field is `platformFee` (renamed from `serviceCharge` when the model was clarified). `SEED_FLAG_SUFFIX` in [src/context/OrdersContext.tsx](src/context/OrdersContext.tsx) gets bumped (currently `"everSeeded.v6"`) any time the persisted `Order` shape changes so existing browsers re-seed once instead of rendering stale data.

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
- **INCOMING**: `[{ label: "Edit items" }, { label: "Reject order", tone: "destructive" }]`. Edit → [EditOrderSheet.tsx](src/screens/vendor/EditOrderSheet.tsx). Reject → [RejectModal.tsx](src/screens/vendor/RejectModal.tsx) (reason picker + Out-of-stock auto-suggests items from the order + 0/RM5/RM10 apology credit).
- **COOKING**: `[{ label: "Edit items" }, { label: "Push back ETA" }]`. Push back → [PushBackEtaSheet.tsx](src/screens/vendor/PushBackEtaSheet.tsx) (+5/+10/+15/Custom). Updates per-order `prepMinutes`, customer gets a "running X late" WhatsApp.
- **READY**: no kebab. Primary action is "Customer arrived" / "Driver collected".

**Edit items flow** — covers the "kitchen called the customer about a sub" case. [EditOrderSheet.tsx](src/screens/vendor/EditOrderSheet.tsx) lists every line with an inline qty stepper, a **Substitute** button, and an **Out of stock** pill (trash icon + label). Edits are staged locally; "Apply changes & notify customer" commits them in one batch. Substitute opens a full-screen menu picker (search + grouped by category) — picking an item swaps the line, preserving qty. The substitution uses `defaultSelections` (first required option per modifier group); the vendor's already negotiated specifics on the phone, so the modifier picker's been deliberately skipped. Last-line removal is blocked — the Out-of-stock pill disables when only one line remains; vendor should reject the order instead. Tapping Out of stock both removes the line *and* 86s the item via `StockContext.toggleItem` so the next customer doesn't immediately re-order it (mirrors the auto-86 behavior already in the Reject modal). `OrdersContext.applyOrderEdits(id, newLines, summary)` recalculates subtotal / platform fee / SST from the new lines, preserves deliveryFee and discount, pushes one combined kitchen-bubble status update, and if the new total drops below the original, auto-issues a partial refund (pending → processed via the same 2s mock cycle as `issueRefund`). If the new total is *higher* than the original, the sheet flags it but doesn't auto-charge — see the Stripe upcharge flag at the top of "Known gaps" for the production plan.

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

> **🚩 FLAG TO USER AT NEXT SESSION START:** The vendor edit-order flow ([EditOrderSheet.tsx](src/screens/vendor/EditOrderSheet.tsx)) handles the upcharge case (sub costs more than original) by *only flagging it* in the sheet. The customer's WhatsApp doesn't reflect the new charge, no Stripe top-up fires. **Real plan: Stripe off-session charge with a saved PaymentMethod.** First payment at checkout sets `setup_future_usage: 'off_session'` and saves the card on a `Customer`. When kitchen edit-pushes the total up, backend creates a fresh PaymentIntent for the delta with `off_session: true, confirm: true, customer, payment_method`. Silent success → Stripe email receipt. `authentication_required` error → fall back to a WhatsApp link with `next_action.use_stripe_sdk` redirect for 3DS. Downcharge case (already wired in `applyOrderEdits`) just needs the mock partial-refund swapped for `stripe.refunds.create({ payment_intent, amount })` against the original PI. Demo-only stop-gap if user wants visible UX in the prototype: add a fake "Card charged RM4.64 — top-up for kitchen substitution" bubble to the customer WhatsApp on the upcharge path. Open the conversation by raising this — user explicitly asked to be reminded.

Removed (now built): real refund flow, address picker, customer cancellation, push-back ETA, vendor → customer messaging, operating hours and schedule, end-of-day close-out, tax receipt with venue-controlled tax info, delivery minimum, promotions, two-component ETA model, kitchen prep default editor, vendor edit-order flow.

Still gaps:
1. **Real photography.** Bar Abong has four shots on disk; FowlBoys' Bone In has the one local image; everything else uses Unsplash placeholders or renders a tall white block. Replace `MenuItem.image` paths as more real photography lands.
2. **Real Stripe** behind Place Order. `Card •••• 4242` is a placeholder. Production uses Stripe (not Billplz, despite earlier doc references); see the upcharge-handling flag at the top of this section for the broader payment-flow plan.
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

*(Historical note — kept because the surrounding section explains the Pass 1 → Pass 2 motivation. The schema has since been generalized; current shape is documented under "Modifier-group schema" below.)* The original `MenuItem` shape was FowlBoys-specific — `combo` (heat + dip + side), `heatOnly` (sandwich heat picker), `sizes` (bone-in / tenders / wings piece counts), per-piece heat upcharges, and a global `HEAT_LEVELS / DIPS / SIDES` enum. Pass 2 generalized this so any venue can express its modifier groups (heat, sauce, size, doneness, custom add-on lists) without baking FowlBoys assumptions into the schema or into ItemScreen / CartScreen / VendorOrderCard rendering. The resulting shape is `MenuItem.modifierGroups: ModifierGroup[]`.

---

## Discovery homepage — Pass 2

Tapow is WhatsApp-native: customers tap a link or scan a QR to land on this app inside WhatsApp's in-app browser. Pass 2 adds the discovery homepage at `/` so the deep links don't all go straight to a single venue's menu.

### Routing

[src/App.tsx](src/App.tsx) branches on `window.location.pathname`. Anything matching `/v/<slug>` mounts the existing venue tree (VenueProvider + nested contexts + perspective-aware frame + DemoControls). Anything else renders `<DiscoveryScreen />` inside a phone-variant `<PhoneFrame />` — no perspective, no orders/store/etc. providers, because discovery is purely a customer browse surface and reads cross-venue order data straight from localStorage. Navigation between discovery and venue is full-page (`window.location.assign` / `history.back()`); each route owns its provider tree, so brand-token transitions stay clean and there's no SPA wiring to maintain.

### Venue catalog

[src/data/venues/index.ts](src/data/venues/index.ts) carries 14 venues — Bar Abong (KK Waterfront, modern Seafood small-plates, pinned to top of discovery via stable rating-desc sort tied with Goojiburg), Goojiburg (KK smashburger spot, real menu, 5.0 rating), FowlBoys (KL, full menu), Noko Noko (agave bar in Plaza Damansara), and 10 KK venues (Alu-Alu Kitchen, Welcome Seafood, Upperstar, Suang Tian, Chilli Vanilla, Little Italy KK, Kohinoor, Biru Biru Cafe, El Centro, Octoverse Coffee). Each venue carries discovery-card metadata: `cuisine`, `priceTier` (1–3), `rating`, `ratingCount`, `estimatedDeliveryMinutes` tuple, `deliveryFee`, `heroImage` (Unsplash placeholders for most; Bar Abong uses a local jpg), `isOpen`, optional `hasOffer`, optional `lat`/`lng` (populated only for Bar Abong today), optional `cashAccepted` + `acceptedPaymentMethods` (populated only for Bar Abong, which is card-only). Bar Abong, FowlBoys, Kohinoor, Goojiburg, and Alu-Alu Kitchen have populated menus; the other 9 carry `menu: []`.

### Discovery layout

[src/screens/discovery/DiscoveryScreen.tsx](src/screens/discovery/DiscoveryScreen.tsx), top to bottom:

- **Sticky top**: single-line location pill (📍 Home + chevron) on the left; `❤ Favourites` toggle button + 🔔 notification bell on the right (both 40px round, canvas bg). Below that, the unified filter-chip row: `🛵 Delivery ⌄` *(opens mode sheet — Delivery / Pickup, exact-one)* · `Sort by ⌄` · `Under 30 min` · `⭐ Top rated` · `Free delivery` · `🏷️ Offers`. Mode + Sort are dropdown chips (open bottom sheets); the rest are independent boolean filter chips that AND together. The favourites toggle is a scope modifier — it ANDs with everything else; heading composes ("Italian favourites" / "Top rated favourites" / etc.).
- **Scrollable body**: cuisine tile row (10 emoji tiles, ordered to surface populated cuisines first; tap toggles a filter), conditional Order Again rail, restaurant list.
- **Sticky bottom**: floating Uber Eats-style rail — home + pin + centered search field + cart + profile. Only the search field is wired; tapping it opens the search overlay. There is no top-bar search trigger; the bottom rail is the single search entry point.

Restaurant cards show hero image with optional offer pill (top-left), name, star rating + cuisine + price-tier dollar signs, ETA + delivery fee. Closed venues dim and sink to the bottom of the list with a "Currently closed" pill overlay.

### Cross-venue Order Again rail

Reads `tapow.<slug>.orders.v1` from localStorage for every venue in `VENUES`, surfaces ones with at least one collected order, sorted most-recent first. Renders as a horizontal scroll of restaurant tiles with relative-time labels ("Last ordered 2d ago"). Hidden when no venue has past orders. Cross-venue is intentional — discovery is a global customer surface, not venue-scoped.

### Search overlay

[src/screens/discovery/SearchOverlay.tsx](src/screens/discovery/SearchOverlay.tsx) is a full-screen overlay opened from the bottom-rail search field. Top is a back arrow + a single search input ("Search Tapow"). Case-insensitive substring match against venue names, taglines, cuisines, and (for venues with menus) item names. Results split into Restaurants / Dishes sections; tap → `/v/<slug>`.

**Empty-state landing** (Uber Eats pattern, no query yet):
- **Order again** — round 80px thumbnails, name + min ETA below. Reuses `buildOrderAgainList()` from shared.ts. Tap → `/v/<slug>`.
- **Top categories** — vertical list of all 10 cuisines, emoji tile + cuisine name, hairline dividers between rows. Tap → set the discovery cuisine filter via `onSelectCuisine` callback, close the overlay, scroll discovery to top.

[src/screens/discovery/shared.ts](src/screens/discovery/shared.ts) holds `CUISINE_TILES`, `OrderAgainEntry`, `buildOrderAgainList()`, `relativeTimeFrom()` — used by both DiscoveryScreen and SearchOverlay.

### Brand tokens on discovery

`:root` in [src/index.css](src/index.css) holds Tapow's palette as the default (green primary, same as FowlBoys). `<VenueProvider>` overrides to the active venue's tokens on /v/<slug>. On / there's no VenueProvider, so the defaults stand. Full-page navigation between routes means tokens are applied fresh on each render — no SPA token-resetting logic.

### Per-venue menus

Menus live in [src/data/menus/](src/data/menus/) — one file per venue, each exporting a `MenuCategory[]`. Five are populated today:

- **[src/data/menus/fowlboys.ts](src/data/menus/fowlboys.ts)** — combo items (Bone In, Tenders, Wings) with four required modifier groups (size, heat, dip, side). Heat options on Xtra/XX Hot tiers carry `priceDelta: 2.5` with `perPiece: true` — the size group's selected `pieces` multiply the upcharge, so 3 pieces XX Hot = +RM 7.50. heatOnly items (sandwiches) have just the heat group. Pasta and house salad have an optional add-on group.
- **[src/data/menus/kohinoor.ts](src/data/menus/kohinoor.ts)** — 32 categories, ~190 items, transcribed from foodpanda. No modifier groups (modifiers absent in source). Items render as price-only entries.
- **[src/data/menus/goojiburg.ts](src/data/menus/goojiburg.ts)** — KK smashburger spot, 3 categories, 10 items. Beef burgers carry a beef add-ons group (multi, max 6) + a combo group (multi, max 1). Chicken burgers carry their own add-ons group + the same combo group. The schema's `max` enforces foodpanda's "select up to 1" rule.
- **[src/data/menus/alu-alu-kitchen.ts](src/data/menus/alu-alu-kitchen.ts)** — Chinese seafood, 17 categories, ~75 base items. Stress-tests the schema with three new patterns: (1) **Small/Medium pricing** as a required size group with item-specific deltas (used by 13 categories); (2) **matrix-priced sections** (Noodles 6×7, Noodle Soup 5×7, Live Fish 6×5, Live Prawn 3×2) modeled as one item per cooking style with a shared required modifier for the variable axis (protein/fish/prawn type) — base price = cheapest variant, deltas walk up to the most expensive, no item explosion; (3) **per-kg / seasonal items** keep representative pricing with a description note that the kitchen confirms by weight or market on the day. A few one-offs: half-chicken items skip the size group; CR05 (Singapore Chilli Crab) carries an optional "+RM 5 mantou (4 pcs)" add-on; R02 has an optional "Upgrade to snapper +RM 2".
- **[src/data/menus/bar-abong.ts](src/data/menus/bar-abong.ts)** — modern Seafood small-plates (cuisine `"Seafood"`), 5 sections transcribed literally from the printed menu (snacks → Land → Sea → desserts → Drinks). The opening snacks block and closing desserts block carry empty `name: ""` strings — the source menu had no header on either, and MenuScreen / SearchOverlay skip rendering category names when empty. Four items carry `containsAlcohol: true` (the ▲ glyph items). Drinks category carries `note` ("Bottles displayed in fridge / By the glass displayed on the board") rendered as italic muted text under the items. Four items have real photography on disk (Local Sole, Fish Sandwich, Stingray Sambal, Jicama Squid Ball).

Each `Venue` carries its menu through `venue.menu`; the customer flow reads from there rather than a static import. [src/screens/MenuScreen.tsx](src/screens/MenuScreen.tsx) and [src/screens/ItemScreen.tsx](src/screens/ItemScreen.tsx) read from `useVenue().menu`; `findMenuItem` and `CategoryDrawer` take the menu as a parameter / prop. The 9 still-empty venues fall through to the `ComingSoon` placeholder via the `venue.menu.length === 0` gate.

### Modifier-group schema

[src/data/menu.ts](src/data/menu.ts):

```ts
type ModifierOption = {
  id: string;
  label: string;
  priceDelta?: number;       // added when selected (defaults to 0)
  perPiece?: boolean;        // multiply by `pieces` from the item's "size"-kind group
  pieces?: number;           // exposed by size-kind group options
};

type ModifierGroup = {
  id: string;
  label: string;
  required: boolean;         // customer must pick at least one option
  multi?: boolean;           // true = checkbox; absent/false = radio
  max?: number;              // upper bound for multi-select
  kind?: "size";             // marks the size-shaped group for per-piece pricing
  options: ModifierOption[];
};

type MenuItem = {
  id, name, description?, price, badge?, image?,
  modifierGroups?: ModifierGroup[];
};
```

[src/context/CartContext.tsx](src/context/CartContext.tsx) holds `CartLine.selections: Record<groupId, optionIds[]>` (single-select groups carry an array of length 0 or 1 for uniformity). `computeUnitPrice(item, selections)` resolves pieces from the `kind: "size"` group and walks every selected option, summing `priceDelta` (× pieces if `perPiece`). `selectionLabels(item, selections)` returns the option labels in modifier-group order — used by cart, vendor card, receipt, and reorder.

[src/lib/orders.ts](src/lib/orders.ts) `OrderLineSnapshot` carries `modifierLabels: string[]` (already-resolved display strings, in display order). Renderers join with " · ". The reorder flow in MenuScreen reconstructs `selections` from `modifierLabels` by matching label-to-option within each group — multi-select picks all matches, single-select picks the first match (or falls back to the first option if required).

ItemScreen renders each modifier group generically: radio for single-select, checkbox for multi. The "select up to N" cap on multi groups bumps out the oldest selection rather than refusing the click — feels closer to a dropdown than a strict gate. Validation: required groups need at least one selection; multi-with-max can't exceed max.

### Per-item note + unavailable action

Below the modifier groups, every item has two extra inputs (rendered for *all* items, not gated on schema):

- **"Any requests?"** — optional textarea, max 200 chars, placeholder *"Extra sauce, less spice, no drama."* Stored on the line as `itemNote: string` (trimmed; empty → undefined). Distinct from the order-level `note` on CartScreen — that one's still the kitchen-wide note.
- **"If this item is not available"** — required `<select>`, options `"remove"` (default) / `"call"`. Stored as `unavailableAction: "remove" | "call"`. Snapshot only writes the field when it's non-default (`"call"`) so the seed history and most lines stay clean.

Both fields live on `CartLine` ([src/context/CartContext.tsx](src/context/CartContext.tsx)) and are copied through `snapshotLines()` into `OrderLineSnapshot` ([src/lib/orders.ts](src/lib/orders.ts)). `UnavailableAction` type is exported from CartContext.

Renderers:
- **CartScreen** — italic `"…note…"` line under the line title; small amber chip "Call if unavailable" when `unavailableAction === "call"`.
- **VendorOrderCard** — same shape: italic `Note: "…"` line and the "Call if unavailable" chip in the items list.

The unavailable-action picker exists because Tapow's WhatsApp identity means we can't fall back on an in-app push when an item 86's mid-cooking — the kitchen needs to know "remove silently" vs "call me, I'll re-pick" upfront.

### Stock — items only

`StockContext` was simplified: the FowlBoys-only `disabledHeats` field is gone. Now just `disabledItemIds: string[]`. VendorStockScreen and ManagerApp's stock UI both read from `useVenue().menu`, so a non-FowlBoys vendor sees their own menu's items in the stock toggles. Storage key bumped `stock.v1` → `stock.v2`.

### Per-venue auto-seed dispatcher

[src/context/OrdersContext.tsx](src/context/OrdersContext.tsx) `buildSeedHistory(venue)` dispatches to one of three paths so the auto-seed isn't shared across venues:

- `venue.menu.length === 0` → returns empty (no phantom orders on the 9 placeholder venues).
- `venue.slug === "fowlboys"` → `buildFowlBoysSeed(venue)`, hand-picked combo / heat / dip / side data using the new modifier-label shape.
- Otherwise (Kohinoor, Goojiburg, Alu-Alu Kitchen) → `buildGenericSeed(venue)`, which flattens `venue.menu` into a deterministic item pool and picks 22 orders' worth of line items from it. No modifiers attached, just name + qty + price.

`SEED_FLAG_SUFFIX` was bumped to `"everSeeded.v3"` so existing browsers re-seed once on next load with line snapshots in the new `modifierLabels` shape.

### Per-venue search default state

Tapping the search icon on MenuScreen used to show a "Search by name or description" prompt with no items visible. It now shows the full menu (grouped by category) by default and filters in place as the customer types — matches Grab's in-menu search pattern. Result count appears only when there's an active query. Placeholder copy: "Have a craving?".

### Back-to-discovery and scroll preservation

The MenuScreen header gained a back arrow to the left of the hamburger. `backToDiscovery()` prefers `window.history.back()` when there's a same-origin referrer and `history.length > 1` (so the browser's bfcache or scroll restoration kicks in for free), and falls back to `window.location.assign("/")` for the deep-link case (e.g., a user lands directly on /v/<slug> from a WhatsApp link with no history entry).

The discovery body scrolls inside an `overflow-y-auto` div, not the document, so browser-native scroll restoration doesn't apply to it. DiscoveryScreen rAF-throttle-saves the scroll position to `sessionStorage["tapow.discovery.scroll"]` and `useLayoutEffect`-restores it on mount. `navigateToVenue(slug, scrollTop)` saves one final time at click — covers the gap between the last frame's save and the page transition.

### New icons

[src/components/icons.tsx](src/components/icons.tsx) gained `HomeIcon`, `UserIcon`, `StarIcon` (filled), `FilterIcon`, `SortIcon`, `ShoppingBagIcon`, `TagIcon`. (FilterIcon is unused since the UX-density pass dropped the "Filters" chip; left in icons.tsx in case a real filters sheet is wired later.)

### Discovery polish — Pass 3

Wired the four chrome elements that were originally placeholder on the discovery screen:

- **Pickup tab** is now stateful (paired with Delivery). When pickup is on, restaurant cards swap their meta line from `"25–35 min · RM5 delivery"` to `"Ready in {kitchenPrepDefaultMinutes} min · Pickup"`, the Under-30 chip filters by prep minutes instead of delivery ETA, the Sort sheet's time option re-labels to "Pickup time", and the delivery-fee sort option is hidden (irrelevant in pickup mode).
- **Sort by** chip opens a bottom sheet with Recommended / Rating / Delivery (or Pickup) time / Delivery fee. Chip label updates to reflect the active sort. Closed venues stay anchored to the bottom regardless of sort key. Sheet uses the standard `absolute inset-0 z-40 bg-black/40` + `sheetUp` keyframe pattern.
- **Notification bell** opens a bottom sheet of cross-venue order updates pulled from `tapow.<slug>.orders.v1` for every venue in `VENUES`. `buildNotifications()` lives in [src/screens/discovery/shared.ts](src/screens/discovery/shared.ts) — last 7 days, top 12, sorted desc by `at`. Each row: venue name + colored status pill (incoming/cooking/ready/collected/rejected/cancelled) + `#shortId` + last status text + relative time. Free-text vendor messages get a 💬 avatar; system events get 🛵. Bell carries an unread badge counting active orders (incoming/cooking/ready). Tap a row → navigates to that venue.
- **Hero category cards** *(removed in the Discovery UX-density pass — see below)*. Originally: four big colored cards (Near Me / Top Rated / Free Delivery / New on Tapow) below the cuisine tiles, each toggling a single `heroFilter`. Took ~130px of body real estate for what turned out to be regular boolean filters. Functional load migrated: Top Rated and Free Delivery became chips in the filter row; Near Me (a sort proxy, not a filter) folded into the existing "Delivery time" / "Pickup time" sort option; New on Tapow (`ratingCount < 250`) was dropped — low signal for venues we control onboarding for.

Layered with existing chips (cuisine tile / Under 30 min / Offers): all filters AND together. The list heading swaps to reflect the active filter ("Indian restaurants" / "Top rated" / etc.). Notifications sheet re-reads localStorage every time it's opened, so a freshly-placed order shows up without a refresh.

### Discovery UX-density pass

Tightening pass after seeing the discovery screen side-by-side with Uber Eats. Same surface area, ~2x the affordance density in the chrome, one extra restaurant card above the fold.

Cuts shipped:
- **Single-line location pill**. Was: stacked "Deliver now" small-label + "Home ⌄" big-label (~50px). Now: `📍 Home ⌄` on one row (~30px). "Deliver now" was redundant once delivery is the implicit default.
- **Delivery/Pickup compressed into one dropdown chip** at the start of the filter chip row (replaced an earlier interim of two side-by-side chips, which itself replaced the original standalone ~50px row). Tapping it opens a `ModeSheet` bottom sheet (mirrors `SortSheet`) — Delivery / Pickup with checkmark on active. The chip dark-styles when Pickup is on so the non-default mode reads at a glance.
- **Hero category cards row dropped entirely** (above bullet). Saves ~130px below the cuisine tiles, reclaimed for an extra restaurant card above the fold.
- **"Under RM3.00" and "Filters" chips dropped** — neither was wired, both were visual placeholders.
- `applyHeroFilter` / `heroFilter` state / `HeroFilterId` type / `HERO_CATEGORIES` constant / `HeroCategoryRow` component all removed. `sortVenues` lost its `hero === "near-me"` speed-bias branch since the same effect is now reachable via the explicit "Delivery time" sort.

Restaurant card redesign (Grab-style, denser):
- Horizontal layout — 112px (`w-28`) thumbnail on left, three-row text column on right (name / `⭐ rating (count) · $$ · cuisine` / `ETA · fee`). Hairline divider between cards (`border-b border-gray-100`) instead of a 16px gap. Card height ~136px vs the old ~280px full-bleed-hero card. Target density: 4-5 cards above the fold w/ Order Again rail, 5-6 without.
- Offer pill shrinks to a small corner badge on the thumbnail (top-left, 10px font). Closed state: 35% black overlay + tiny "CLOSED" label. Both preserve information density without taking dedicated rows.
- Per-card **kebab** at top-right opens `CardActionSheet` — two actions: **Add to / Remove from favourites** (filled heart, rose when favourited) and **Hide this restaurant** (eye-slash icon, "You won't see it for 30 days" subcopy). The full hit-area for the card is a separate `<button>` from the kebab so taps don't collide.

Favourites + hide system:
- Both backed by `localStorage` via `readFavourites` / `writeFavourites` / `readHidden` / `writeHidden` in [src/screens/discovery/shared.ts](src/screens/discovery/shared.ts). Favourites: `Set<slug>`. Hidden: `Record<slug, timestamp>` with 30-day auto-prune on every read.
- Favourites is a **scope modifier**, not a separate destination. The ❤ button in the top bar toggles `favouritesOnly`; the existing view stays — chrome, cuisine tiles, chip row, all of it — and the venue list narrows. Heading composes: "Favourites" alone, "Italian favourites" when stacked with a cuisine, "Top rated favourites" when stacked with the Top rated chip.
- Hidden venues filter out of the list immediately and don't return until 30 days elapse. Stored as `{ slug: timestamp }` so the timer is real, not just label copy. Hidden venues are still searchable on a venue's own URL (`/v/<slug>`) — discovery is the only surface that respects the hide.
- A small filled-rose heart appears at bottom-left of the thumbnail when a venue is favourited (purely an indicator; the kebab is the entry point for toggling).
- `SearchOverlay` accepts `scopedSlugs` + `scopeLabel` props — when the favourites toggle is on, the overlay restricts the searchable pool to the favourited slugs and re-labels the placeholder to "Search your favourites." The chains case (3 locations of the same brand, 1 favourited) is automatically correct since each location is its own venue slug.
- Empty state when `favouritesOnly && favouritesCount === 0`: "No favourites yet — tap ⋯ on any restaurant and choose 'Add to favourites' to save it here."

**KIV for a future pass:**
- **Carousel-section hero cards** — if the hero cards get reinstated, do them as carousel-section heroes (Uber Eats' "Featured on Tapow" / "Places you might like" pattern) rather than the prior four-card filter strip. That pattern adds variety + merchandising load without competing with the chip row for the same job. Don't reintroduce the old shape — Top Rated and Free Delivery are already covered by chips, and a filter strip and a chip row doing the same thing is the exact density regression we just fixed.
- **Chains / multi-location.** When a brand has N locations on Tapow, the favourites filter already does the right thing (slug-based; only the favourited location appears). The search-within-favourites scoping is the first piece of "filter within a long list." If the favourites list ever gets long enough that a dedicated in-place search input would help (rather than the bottom-rail overlay), wire one above the heading when `favouritesOnly && favouritesCount >= ~10`. Until then the overlay scope is enough.
- **Surface "manage hidden venues"** — there's no UI today to un-hide a venue ahead of the 30-day timer. If users complain we hide too aggressively, add a row to Settings or a chip in the empty state to clear all hides.

Inline "narrow further" search:
- When any filter is active (cuisine, top-rated, free-delivery, under-30, offers, favourites), an inline `InlineSearchInput` slot renders below the chip row, inside the sticky region. Placeholder reads "Narrow N restaurants…" with the live filtered count. Typing substring-matches against `venue.name`, `venue.cuisine`, `venue.tagline` on the already-filtered set, narrowing the visible list further without leaving the view.
- Distinct from the bottom-rail search button — the inline input is the lightweight "I already filtered, now type to refine" tool, while the bottom rail still opens the full `SearchOverlay` for cross-venue dish/menu search.
- `inlineSearch` state auto-clears via effect when `anyFilterActive` flips false, so a hidden constraint can't persist when the input itself unmounts.

Order Again rail auto-hides:
- The cross-venue Order Again rail above the restaurant list hides whenever `anyFilterActive` is true. Rationale: the rail is a global "your past orders, regardless of filter" surface; showing it under a filtered list visually contradicts the user's filter intent. `pickupMode` does NOT count toward `anyFilterActive` — past orders exist regardless of delivery/pickup mode.

What did NOT change in this pass: cuisine tile row stays in the scroll body (sticky promotion was considered in proposal C; deferred until we see whether always-visible cuisine tiles are actually missed on scroll); bottom rail unchanged; sort/notifications sheets unchanged.

### Menu UX-density pass + dish favourites

After the discovery pass, the menu screen got the same treatment plus a new dish-favourites system.

Cuts shipped on the menu list:
- **Item row image bumped 80px → 112px** (`w-20` → `w-28`), `rounded-lg` → `rounded-xl`, to match the discovery card thumbnail. Same aspect, same chrome — they read as the same visual object across screens.
- **The `+` button dropped entirely** from item rows. The whole row was already the tap-into-detail target; the `+` glyph implied "add to cart" but actually navigated to `ItemScreen` like the rest of the row. With the heart toggle now serving as the per-row action, the `+` was redundant decoration. The dropping also reclaims the bottom-right of every thumbnail where the `+` used to sit.

Dish favourites system:
- Backed by [src/lib/dishFavourites.ts](src/lib/dishFavourites.ts) — a global `Set<itemId>` persisted in `localStorage` under `tapow.dish-favourites.v1`. Item IDs are venue-prefixed (`ba-fish-sandwich`, `gj-beef-single`, …) so one global set scopes per venue without collisions. Helpers: `readDishFavourites`, `writeDishFavourites`, `toggleDishFavourite`, `isDishFavourite`.
- **MenuScreen top bar**: heart icon next to the search icon. Tap → toggles `favouritesOnly` — the menu narrows to favourited items in this venue only. Categories with 0 favourited items hide from the sticky strip, the in-list section list, and the `CategoryDrawer`. `searchResults` scopes to whatever the menu is currently filtered to (favourites-only stays favourites-only inside search). The scroll-spy snaps `activeCat` to the first remaining category if the current active one gets filtered out. Empty state when 0 favourites in this venue: `EmptyFavouritesState` — small rose heart in a canvas circle + "No favourite dishes yet" + "Tap the heart on any dish — it'll show up here for instant access next time."
- **ItemScreen top-right**: heart toggle mirroring the close-button chrome (36px white circle, shadow, top-4 right-4). Fills rose when saved; outline + ink when not.
- **Per-row heart on ItemRow**: small 28px heart at `top-3 right-1.5` regardless of whether the item has an image — the y-position aligns to the title line. For image items the heart sits on the image's top-right with a white pill + shadow; for text-only items it floats at the row's top-right with no background. Tap stops propagation so toggling favourite never accidentally navigates into the detail.
- Toggling from MenuScreen, ItemScreen, or per-row updates the same `localStorage` set; in-screen state stays consistent via `setDishFavourites(toggleDishFavourite(itemId))`.

Parallel to the discovery venue-favourites system — same mental model (scope toggle, not a destination), same heart glyph, same rose fill — but a separate code path because the use cases (saving a venue vs saving a dish) are independent.

**KIV for a future pass:**
- **Cross-venue "your dishes" surface.** Right now dish favourites are only reachable inside the venue's own menu. A global "Your saved dishes" view across venues (Profile tab on the bottom rail?) would let users hop from "I'm hungry" → "I want my Fish Sandwich" → straight into Bar Abong's cart. Bundle with the cross-venue customer-identity work (the Profile icon is currently unwired).
- **Dish-favourites ↔ review system.** When per-item reviews land (Pass 4 future-note #1), the heart and the rating star should share the same per-item identity model — favourite + rate from the same surface.

### Out of scope for this pass (and why)

- **Real menus for most venues** — Bar Abong, FowlBoys, Kohinoor, Goojiburg, and Alu-Alu Kitchen are populated; the remaining 9 placeholders are unblocked by the modifier-group schema but still need their data transcribed. Those are next-pass content work, not architecture.
- **SPA navigation between discovery and venue** — full-page reload is simpler and the WhatsApp in-app browser handles it fine.
- **A real cart icon badge on the bottom rail** — discovery has no global cart; cart is scoped per venue. Showing a count would require summing across venue carts, which doesn't match the data model.
- **Geo / distance** — no real distance sort yet. Most venues still have no coordinates (Bar Abong is the only one with lat/lng populated; backfill is a later pass). The dropped Near Me hero card was a speed proxy, not a real distance sort.

### Next pass

Content: transcribe menus for the remaining 9 venues (Welcome Seafood, Upperstar, Suang Tian, Chilli Vanilla, Little Italy, Biru Biru, El Centro, Octoverse, Noko Noko). The schema now supports the shapes that were blocked before (cocktails with spirit/mixer/ice picks, coffee with size/milk/strength, indian thalis with spice levels). Each venue is a new file in [src/data/menus/](src/data/menus/) plus a `menu:` wire-up in [src/data/venues/index.ts](src/data/venues/index.ts). Alu-Alu Kitchen ([src/data/menus/alu-alu-kitchen.ts](src/data/menus/alu-alu-kitchen.ts)) is the heaviest reference shape — its matrix-priced sections, Small/Medium size group helper, and per-kg / seasonal handling are all reusable patterns for the rest. Bar Abong ([src/data/menus/bar-abong.ts](src/data/menus/bar-abong.ts)) is the reference for ungrouped sections (empty `name: ""`), `containsAlcohol`, and `MenuCategory.note`.

Architecture-wise, the remaining gap is customer identity (cross-venue profile / order history — the discovery bottom-rail Profile icon is still unwired).

---

## Chat — Pass 4

Earlier passes had a one-way kitchen-message sheet (write-only, vendor → customer, status-update bubbles only). Pass 4 turns it into a real two-way thread on the order, with a three-phase lifecycle, opt-in review capture, and image attach. Customer-side, the post-payment flow splits across **three surfaces** so each one carries only what belongs to it: an in-platform tracking screen as the primary landing, a separate in-platform chat surface for the two-way conversation, and the WhatsApp simulation reduced to its production-correct role — the notification rail.

### Where the surfaces live

- **OrderTrackingScreen** ([src/screens/OrderTrackingScreen.tsx](src/screens/OrderTrackingScreen.tsx)) = the primary post-payment landing. Tapow-styled. Top-to-bottom: lifecycle status line + horizontal progress strip (`Placed → Cooking → Out/Ready → Delivered/Picked up`, driven off the order's `placedAt / acceptedAt / readyAt / collectedAt` timestamps), large ETA card, rider card on delivery (driver name + initials + ETA + an inert *"Track on Lalamove ↗"* button — partner tracking link is the production-correct surface for live rider tracking; the rider is a separate party we don't run a built-in map or chat for), merchant block with a tappable *"Chat with [venue] ›"* row that pushes `orderChat`, payment + savings line, expandable *"View order summary"* (items + delivery address + order ref using the shared `OrderReceiptContent`), *"Receipt sent to your WhatsApp ✓"* line, and a primary *"Back to WhatsApp"* button (code-commented as a demo-flow device — production re-entry is via WhatsApp notification, not an in-app button). ConfirmationScreen now splashes here instead of into WhatsApp.
- **OrderChatScreen** ([src/screens/OrderChatScreen.tsx](src/screens/OrderChatScreen.tsx)) = the two-way chat. Tapow-styled, chat-only. Header is **venue name + #shortId only** — no lifecycle status line, no receipt callback, no "Back to WhatsApp" label; the full status lives only on OrderTrackingScreen. Body: scrollable `Order.messages` thread (no `statusUpdates`), opt-in review affordance under customer messages during `post-delivery`, floating preview pill when scrolled away from the bottom, phase-aware composer with paperclip + camera/album attach. Reached from the merchant block on OrderTrackingScreen OR from the WhatsApp preview pill — either way `back()` pops to the prior surface (NavContext is a real stack, not a hardcoded destination).
- **WhatsAppScreen** ([src/screens/WhatsAppScreen.tsx](src/screens/WhatsAppScreen.tsx)) = the notification rail. WhatsApp chrome (green header, "tapow.my online", chat-bg gradient). Carries the receipt bubble (using the shared `OrderReceiptContent`), system status events (accepted / cooking / ready / refund / delivered / etc.), the refund pill anchored to `statusUpdate.at === refund.requestedAt`, the apology-credit red box on rejection, the cancel-order pill while incoming, the download-receipt pill after collection, and the savings bubble. Free-text vendor messages collapse to a slim `VendorPreviewPill` ("[venue] · New message — Tap to reply ›") that deep-links to `orderChat`. Customer messages are never surfaced here. Reached on-demand from OrderTrackingScreen's *"Back to WhatsApp"* button.

### Shared receipt content

[src/components/OrderReceiptContent.tsx](src/components/OrderReceiptContent.tsx) is the canonical "what was ordered" block — line items with modifier labels + Subtotal / Platform fee (1%) / SST / Delivery / Discount / Total rows. Used both inside WhatsAppScreen's receipt bubble (wrapped in greeting + Bubble chrome) and inside OrderTrackingScreen's *"View order summary"* expandable (wrapped with the delivery address and order ref). Both surfaces share identical totals math and identical line rendering through this one component.

### What changed (data model + plumbing)

- **`Order.messages`** ([src/lib/orders.ts](src/lib/orders.ts)) — new `OrderMessage[]` field carrying `{ id, from: "vendor" | "customer", text?, image?, at }`. Replaces the legacy `statusUpdates.fromVendor` flag (still readable on persisted state but never set on new writes; system events stay in `statusUpdates`, chat goes here). `sendVendorMessage` is widened from `(id, text)` to `(id, { text?, image? })`; new `sendCustomerMessage` with the same shape. Both funnel through `appendMessage` ([src/context/OrdersContext.tsx](src/context/OrdersContext.tsx)) so the same array stays time-sorted on commit, and persists/syncs over the existing per-venue BroadcastChannel.
- **NavContext** ([src/context/NavContext.tsx](src/context/NavContext.tsx)) — adds `| { name: "orderTracking"; orderId: string }` and `| { name: "orderChat"; orderId: string }` to `Screen`. Routed through [App.tsx](src/App.tsx) `CustomerScreen`. `back()` is a true stack pop, so the chat's back-control works the same whether opened from tracking or from the WhatsApp preview pill.
- **Three-phase lifecycle** — `getChatPhase(order)` returns `pre-pickup | in-transit | post-delivery | closed`. `POST_DELIVERY_CHAT_WINDOW_MS` (default 4h after collection) gates the feedback window; after it elapses (or on reject/cancel) the thread renders read-only on both sides. `lifecycleLabel(order)` returns the pinned status-line copy + tone, surfaced on OrderTrackingScreen's progress section and as the header strip inside `VendorChatSheet`.
- **Vendor surface** — new [src/screens/vendor/VendorChatSheet.tsx](src/screens/vendor/VendorChatSheet.tsx) — full-thread bottom sheet (lifecycle strip + scrollable bubbles + quick-reply chips + paperclip-enabled composer). Opens from a "Messages" kebab item on every kanban card and from the order-detail screen's Messages button. Replaces the earlier one-shot `SendMessageSheet`.
- **Vendor-side unread** — new [src/lib/vendorReadState.ts](src/lib/vendorReadState.ts) holds a `Record<orderId, lastReadAtMs>` per-tab in localStorage. Deliberately **outside** `Order` and **outside** the BroadcastChannel sync — read-state is a UI concern of whoever's looking at the kitchen tablet; syncing it would mean a manager peeking at their phone silently clears the vendor's badge. `useChatUnreadCount(order)` uses `useSyncExternalStore` so the badge re-renders live as customer messages arrive or as the vendor opens the sheet. `KanbanCard` wrapper in [src/screens/vendor/VendorMainScreen.tsx](src/screens/vendor/VendorMainScreen.tsx) prepends a "Messages · N" kebab item and feeds `unreadChatCount` into the order card's kebab badge.
- **Opt-in review** — lives on OrderChatScreen. Within `post-delivery` only, every customer-authored message renders a small inline "Also save as review?" prompt with a 5-star selector. On opt-in, `promoteMessageToReview(orderId, messageId, rating)` stores `OrderReview = { rating, text, promotedFromMessageId, at }` on the order. Single-shot per order — once anything is promoted, the affordance hides on every other message and the promoted bubble swaps to a "Saved as review" pill. Operational and refund messages stay out of the review pool unless the customer explicitly promotes them.
- **Image attach** — paperclip on both sides opens a tiny action picker (Take photo / Choose from album), backed by hidden `<input type="file" capture="environment">` and `<input type="file">` respectively. Files run through `compressImageToDataUrl` ([src/lib/imageCompress.ts](src/lib/imageCompress.ts)) — JPEG, ~1000px longest edge, quality 0.7 — and land on the message as a `data:image/jpeg;base64,...` URL. Hard ceiling of `MAX_IMAGES_PER_THREAD = 2` combined per thread, enforced via `countThreadImages(order)`; further attaches show an inline notice. The cap is **mandatory** for the demo because images ride inside `Order` objects through localStorage + BroadcastChannel — uncompressed or unbounded attachments overflow the quota and corrupt the sync.
- **In-thread preview pill** — OrderChatScreen tracks scroll position; when the customer is scrolled away from the bottom and a new vendor message arrives, a floating pill appears above the composer ("[VenueName] · short preview ↓"). Tap → smooth-scroll to bottom + clear unread. `lastSeenAt` initializes to `Date.now()` at mount so existing seeded vendor messages don't trigger it.
- **Seeded chat thread** — `seedFowlBoysChat` ([src/context/OrdersContext.tsx](src/context/OrdersContext.tsx)) attaches a canonical "out of crack fries → sub waffle fries → yes please" exchange to the most-recent collected FowlBoys order so the chat surfaces (both the customer's `OrderChatScreen` and the vendor's Messages sheet) land populated for the pitch. Pre-set as fully-read (both `lastReadAtVendor` and `lastReadAtCustomer`) — past completed exchange, blue ✓✓ on every bubble. A second seed, `seedFowlBoysUnreadCustomerMessage`, attaches a fresh unread customer message (*"Hey, can I add maple syrup on the side? Forgot to ask 🙏"*) to Sara T.'s cooking pickup order so the vendor-side unread roll-up and the grey-vs-blue tick distinction both have something live to demo. Bumped to `SEED_FLAG_SUFFIX = "everSeeded.v6"` on the cross-party read-receipt fields landing.
- **Message ticks** — grey single `✓` next to the timestamp on every outgoing bubble, flipping to blue `✓✓` when the other party has opened the chat. Cross-party state lives on two new optional Order fields, `lastReadAtVendor` and `lastReadAtCustomer` ([src/lib/orders.ts](src/lib/orders.ts)), bumped via `OrdersContext.markPartyRead(id, from)` and broadcast cross-tab via the existing Order BroadcastChannel sync. The `markPartyRead("vendor")` call fires alongside the existing `markChatRead(id)` in `VendorChatSheet`'s mount-and-on-new-message effect; the customer's `markPartyRead("customer")` fires in `OrderChatScreen`'s `isAtBottom` effect (so the receipt only counts the customer as having "read" once they're actually at the bottom of the thread, not just on mount). **The cross-party `Order.lastReadAt*` fields are deliberately distinct from the per-tab `vendorLastReadAt` map** in [src/lib/vendorReadState.ts](src/lib/vendorReadState.ts): the per-tab map drives the kitchen tablet's kebab badge and is intentionally NOT broadcast (a manager peeking from their phone shouldn't silently clear the tablet's badge); the cross-party fields drive the other side's tick and broadcast freely. Two concerns, two stores. Demo-only single-browser-accurate; production needs the same backend chat transport as cross-device delivery.

### Future / not built yet

Reference markers only — none of this is in scope for the demo, but each is load-bearing for production planning:

1. **Real review system tied to line items → dish-level corpus.** The opt-in flow captures rating + free text against the order, not against individual lines. Production needs structured per-item feedback (so dish ratings, photos, and snippets accumulate across orders) — this is the input to the dish-level corpus.
2. **Dish-level smart search.** Surfacing "spicy stuff people loved this week" or "best vegetarian picks" on discovery depends on the enriched menu-import pipeline + the review corpus above. Blocked on both.
3. **Production chat transport.** The current thread is single-tab localStorage with cross-tab BroadcastChannel — not cross-device, no server persistence, no real WhatsApp Business API dispatch. Production needs a backend chat store + WhatsApp message-send (templates for vendor-initiated, free-form during the 24h session window) + push notifications.
4. **Production image storage.** Replace the `data:image/jpeg` data URL on the message with a Supabase object-storage URL. Raise compression to `~1600px / 0.8` quality so dispute/refund evidence stays legible under zoom — the current 1000px/0.7 cap is a deliberate localStorage workaround, not the quality target. Retention tied to dispute resolution window so evidence survives any open dispute.
5. **Rider contact / tipping.** Pending the Delyva-vs-Lalamove dispatch-API decision — both surfaces (in-app rider call/chat, in-app tip) come from whichever stack we adopt. Explicitly **not** part of vendor chat; the rider is a separate party.
6. **Orders surface** — a list of past/active orders (named "Orders", Uber Eats-style, not "Activity") where the customer can re-enter a recent order's chat within the post-delivery window. Not built yet; current re-entry is via WhatsApp pill / global banner / deep-link only. This is the durable re-entry path for post-delivery issues (missing items, wrong order) once an Orders screen exists. The OrderTrackingScreen is the single-order view; "Orders" is the future list that indexes them.
7. **Per-message inline translation.** Opt-in "See translation" link under each message; translation renders inline beneath the original. Specifically targets Malay-English / Manglish code-switching, which Grab handles poorly — a deliberate differentiator. Translator: GPT (validated on Manglish firsthand). Runtime, server-side (backend). Quality is settled; only revisit the model if per-tap cost/latency at volume forces a cheaper fallback — not on quality grounds. Not built yet.
8. **Voice notes.** Hold-to-record voice messages in chat. Targets vendor staff needing speed mid-rush and older / low-literacy customers who can speak but not type easily; culturally native to Malaysian WhatsApp use. **Not** a demo feature — audio overflows the demo's localStorage / BroadcastChannel ceiling and would corrupt order sync. Production version: voice → transcription → GPT translation (same pipeline as inline translation) → readable text both sides. Backend pipeline, not a frontend widget. Not built yet.
9. **True cross-party read receipts.** The grey-✓ / blue-✓✓ ticks built in this pass are single-browser-accurate: both parties live in the same browser sharing BroadcastChannel, so the cross-party `Order.lastReadAt*` fields update across tabs in real time. Cross-device receipts (customer on their phone, vendor on the kitchen tablet) require the same backend chat transport already noted as deferred (bullet 3). Not a separate build — falls out of the production chat-transport work.
10. **Typing indicators.** Still explicitly out of scope. Same dependency as cross-device read receipts: the production chat transport needs to carry an ephemeral "is typing" signal alongside messages. Not built yet.
11. **Driver-block "WhatsApp driver" control** ([VendorOrderCard.tsx](src/screens/vendor/VendorOrderCard.tsx) ~235-243) is mislabelled and wired to the customer phone, not the rider. Pre-existing bug. Ties into the unresolved rider-contact surface — we don't control the rider; real rider contact depends on the Lalamove / Delyva API (see bullet 5). Resolve as part of the rider-contact surface work, not as a label patch.
