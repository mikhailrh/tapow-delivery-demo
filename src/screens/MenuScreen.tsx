import { useEffect, useMemo, useRef, useState } from "react";
import {
  type MenuCategory,
  type MenuItem,
} from "../data/menu";
import {
  computeUnitPrice,
  useCart,
  type Selections,
} from "../context/CartContext";
import { useNav } from "../context/NavContext";
import { useStock } from "../context/StockContext";
import { useStore } from "../context/StoreContext";
import { useOrders } from "../context/OrdersContext";
import { useVenue } from "../context/VenueContext";
import { formatRM } from "../lib/money";
import type { Order } from "../lib/orders";
import {
  MenuIcon,
  SearchIcon,
  CloseIcon,
  BackIcon,
  ClockIcon,
  RotateIcon,
  ChevronDownIcon,
  HeartIcon,
} from "../components/icons";
import {
  readDishFavourites,
  toggleDishFavourite,
} from "../lib/dishFavourites";

function backToDiscovery() {
  if (typeof window === "undefined") return;
  const sameOriginReferrer =
    document.referrer && document.referrer.startsWith(window.location.origin);
  if (sameOriginReferrer && window.history.length > 1) {
    window.history.back();
  } else {
    window.location.assign("/");
  }
}

export default function MenuScreen({ jumpTo }: { jumpTo?: string }) {
  const venue = useVenue();
  if (venue.menu.length === 0) {
    return <ComingSoon venueName={venue.name} />;
  }
  return <MenuScreenInner jumpTo={jumpTo} />;
}

function MenuScreenInner({ jumpTo }: { jumpTo?: string }) {
  const { go } = useNav();
  const { itemCount, subtotal, addLine } = useCart();
  const { isItemAvailable } = useStock();
  const {
    state: storeState,
    isAcceptingOrders,
    isOutsideHours,
    nextOpenLabel,
  } = useStore();
  const { orders } = useOrders();
  const venue = useVenue();
  const MENU = venue.menu;
  const [reorderToast, setReorderToast] = useState<string | null>(null);

  const recentCollected = useMemo(
    () =>
      orders
        .filter((o) => o.status === "collected")
        .sort(
          (a, b) =>
            (b.collectedAt ?? b.placedAt) - (a.collectedAt ?? a.placedAt),
        )
        .slice(0, 5),
    [orders],
  );
  const [reorderSheetOpen, setReorderSheetOpen] = useState(false);
  const lastOrder = recentCollected[0] ?? null;
  const [scrolled, setScrolled] = useState(false);

  // top bar absolute height (48) + strip height (~40) ≈ 88; scroll-spy fires when a section's top
  // reaches the area just below the strip.
  const SCROLL_SPY_OFFSET = 100;
  // pickCategory scrolls so the section's top lands just below the sticky strip.
  const PICK_OFFSET = 88;

  const onScroll = () => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const top = scrollEl.scrollTop;
    setScrolled((prev) => (top > 30 === prev ? prev : top > 30));

    const threshold = top + SCROLL_SPY_OFFSET;
    if (displayMenu.length === 0) return;
    let next = displayMenu[0].id;
    for (const cat of displayMenu) {
      const section = sectionRefs.current[cat.id];
      if (!section) continue;
      if (section.offsetTop <= threshold) next = cat.id;
      else break;
    }
    setActiveCat((prev) => (prev === next ? prev : next));
  };

  const reorder = (order: Order) => {
    let added = 0;
    let dropped = 0;
    for (const line of order.lines) {
      const item = findMenuItem(MENU, line.itemId, line.itemName);
      if (!item || !isItemAvailable(item.id)) {
        dropped += line.quantity;
        continue;
      }
      const selections = reconstructSelections(item, line.modifierLabels);
      const unitPrice = computeUnitPrice(item, selections);
      addLine({
        item,
        selections,
        unitPrice,
        quantity: line.quantity,
      });
      added += line.quantity;
    }
    if (added === 0) {
      setReorderToast("None of those items are available right now.");
      return;
    }
    if (dropped > 0) {
      setReorderToast(
        `${dropped} item${dropped === 1 ? "" : "s"} unavailable, removed.`,
      );
    } else {
      setReorderToast(null);
    }
    go({ name: "cart" });
  };

  useEffect(() => {
    if (!reorderToast) return;
    const t = setTimeout(() => setReorderToast(null), 3500);
    return () => clearTimeout(t);
  }, [reorderToast]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string>(jumpTo ?? MENU[0].id);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [dishFavourites, setDishFavourites] = useState<Set<string>>(() =>
    readDishFavourites(),
  );

  const toggleFav = (itemId: string) => {
    setDishFavourites(toggleDishFavourite(itemId));
  };

  /* Pre-compute the favourites-filtered menu when the toggle is on so the
     scroll-spy, category strip and section-pinning all operate on the same
     shape they expect — an array of categories with items[]. Categories with
     0 favourites drop out of both the strip and the body. */
  const displayMenu: MenuCategory[] = useMemo(() => {
    if (!favouritesOnly) return MENU;
    return MENU.map((cat) => ({
      ...cat,
      items: cat.items.filter((it) => dishFavourites.has(it.id)),
    })).filter((cat) => cat.items.length > 0);
  }, [MENU, favouritesOnly, dishFavourites]);

  /* When the active category gets filtered out by the favourites toggle, snap
     the active category to the first remaining one so the sticky strip's
     highlight doesn't point at a vanished section. */
  useEffect(() => {
    if (displayMenu.length === 0) return;
    if (!displayMenu.some((c) => c.id === activeCat)) {
      setActiveCat(displayMenu[0].id);
    }
  }, [displayMenu, activeCat]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searching) searchInputRef.current?.focus();
  }, [searching]);

  const closeSearch = () => {
    setSearching(false);
    setQuery("");
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { item: MenuItem; categoryName: string }[] = [];
    /* Search scopes to whatever the menu is currently filtered to —
       favourites-only stays favourites-only inside search. */
    for (const cat of displayMenu) {
      for (const item of cat.items) {
        if (!q) {
          out.push({ item, categoryName: cat.name });
          continue;
        }
        const hay = `${item.name} ${item.description ?? ""}`.toLowerCase();
        if (hay.includes(q)) out.push({ item, categoryName: cat.name });
      }
    }
    return out;
  }, [query, displayMenu]);

  const pickCategory = (id: string) => {
    const section = sectionRefs.current[id];
    const scrollEl = scrollRef.current;
    if (!section || !scrollEl) {
      setActiveCat(id);
      return;
    }
    setActiveCat(id);
    scrollEl.scrollTo({
      top: Math.max(0, section.offsetTop - PICK_OFFSET),
      behavior: "smooth",
    });
  };

  // Honor jumpTo on mount — scroll to the requested category once refs are wired.
  useEffect(() => {
    if (!jumpTo) return;
    const raf = requestAnimationFrame(() => {
      const section = sectionRefs.current[jumpTo];
      const scrollEl = scrollRef.current;
      if (!section || !scrollEl) return;
      scrollEl.scrollTo({ top: Math.max(0, section.offsetTop - PICK_OFFSET) });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo]);

  // Keep the active tab centered in the horizontal scroller
  useEffect(() => {
    const tab = tabRefs.current[activeCat];
    const tabs = tabsRef.current;
    if (!tab || !tabs) return;
    const tabLeft = tab.offsetLeft;
    const tabRight = tabLeft + tab.offsetWidth;
    const viewLeft = tabs.scrollLeft;
    const viewRight = viewLeft + tabs.clientWidth;
    if (tabLeft < viewLeft + 16) {
      tabs.scrollTo({ left: tabLeft - 16, behavior: "smooth" });
    } else if (tabRight > viewRight - 16) {
      tabs.scrollTo({
        left: tabRight - tabs.clientWidth + 16,
        behavior: "smooth",
      });
    }
  }, [activeCat]);

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      {searching ? (
        <>
          {/* Search header */}
          <header className="bg-white">
            <div className="flex items-center px-4 pt-4 pb-3 gap-3 border-b border-gray-100">
              <button
                onClick={closeSearch}
                aria-label="Close search"
                className="p-1 -ml-1"
              >
                <BackIcon className="w-6 h-6 text-brand-ink" />
              </button>
              <div className="flex-1 flex items-center gap-2 bg-brand-canvas rounded-full px-3.5 py-2">
                <SearchIcon className="w-4 h-4 text-brand-muted flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Have a craving?"
                  className="flex-1 bg-transparent text-[14px] text-brand-ink placeholder:text-brand-muted focus:outline-none min-w-0"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-muted/40 flex items-center justify-center"
                  >
                    <CloseIcon className="w-3 h-3 text-white" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <SearchBody
              query={query}
              results={searchResults}
              dishFavourites={dishFavourites}
              onToggleFavourite={toggleFav}
              onPick={(id) => go({ name: "item", itemId: id })}
            />
          </div>
        </>
      ) : (
        <>
          {/* Scrollable body — hero scrolls away under the top bar; strip sticks at top: 48 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
            onScroll={onScroll}
          >
            {/* Hero: pt-16 leaves room for the absolute top bar overlay */}
            <div className="pt-16 pb-3">
              <div className="px-4">
                <h2 className="text-[26px] font-extrabold text-brand-ink tracking-tight leading-tight">
                  {venue.name}
                </h2>
                <div className="text-[13px] text-brand-muted mt-1">
                  {venue.address.split(",")[0].trim()} · {venue.cuisine} · {venue.estimatedDeliveryMinutes[0]}–{venue.estimatedDeliveryMinutes[1]} min
                </div>
              </div>

              {lastOrder && (
                <div className="px-4 mt-3">
                  <div className="w-full bg-brand-canvas rounded-xl flex items-center overflow-hidden">
                    <button
                      onClick={() => {
                        if (recentCollected.length > 1)
                          setReorderSheetOpen(true);
                        else reorder(lastOrder);
                      }}
                      className="flex-1 min-w-0 text-left px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {recentCollected.length > 1 && (
                          <ChevronDownIcon className="w-3.5 h-3.5 text-brand-muted flex-shrink-0" />
                        )}
                        <div className="text-[10.5px] font-bold text-brand-muted uppercase tracking-wide leading-none">
                          {recentCollected.length > 1
                            ? "Past orders"
                            : "Last order"}
                        </div>
                      </div>
                      <div className="text-[13.5px] font-semibold text-brand-ink mt-1.5 truncate">
                        {reorderItemLabel(lastOrder)}
                        <span className="text-brand-muted"> · </span>
                        <span className="tabular-nums">
                          {formatRM(lastOrder.total)}
                        </span>
                      </div>
                    </button>
                    <div className="pr-3 flex-shrink-0">
                      <button
                        onClick={() => reorder(lastOrder)}
                        className="bg-white border border-brand-green text-brand-green rounded-full px-3 py-1.5 text-[13px] font-bold flex items-center gap-1 hover:bg-brand-green/5 transition-colors"
                      >
                        Reorder
                        <RotateIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isAcceptingOrders && (
                <div className="mx-4 mt-3 rounded-lg bg-brand-canvas px-3 py-2 text-[12.5px] flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-brand-ink flex-shrink-0" />
                  <div>
                    {storeState.closingToday ? (
                      <>
                        <span className="text-brand-ink">
                          Closed for the day.
                        </span>{" "}
                        <span className="text-brand-muted">
                          See you tomorrow.
                        </span>
                      </>
                    ) : storeState.status === "paused" ? (
                      <>
                        <span className="text-brand-ink">
                          Currently unavailable
                        </span>{" "}
                        <span className="text-brand-muted">
                          — kitchen is paused. Check back in a few.
                        </span>
                      </>
                    ) : isOutsideHours ? (
                      <>
                        <span className="text-brand-ink">Closed</span>
                        {nextOpenLabel && (
                          <span className="text-brand-muted">
                            {" "}
                            — {nextOpenLabel.toLowerCase()}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-brand-ink">
                        Currently unavailable.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky category strip — sits below the absolute top bar (top: 48) */}
            <div
              className="sticky z-10 bg-white"
              style={{
                top: 48,
                borderBottom: scrolled
                  ? "1px solid rgb(229, 231, 235)"
                  : "1px solid transparent",
                transition: "border-color 180ms ease",
              }}
            >
              <div
                ref={tabsRef}
                className="scrollbar-none overflow-x-auto"
              >
                <div className="flex gap-5 px-4 whitespace-nowrap">
                  {displayMenu.filter((cat) => cat.name).map((cat) => {
                    const isActive = cat.id === activeCat;
                    return (
                      <button
                        key={cat.id}
                        ref={(el) => {
                          tabRefs.current[cat.id] = el;
                        }}
                        onClick={() => pickCategory(cat.id)}
                        className={
                          "relative py-3 text-[14px] transition-colors " +
                          (isActive
                            ? "text-brand-ink font-semibold"
                            : "text-brand-muted font-medium")
                        }
                      >
                        {cat.name}
                        {isActive && (
                          <span className="absolute left-0 right-0 bottom-0 h-[2.5px] bg-brand-green rounded-t" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <section className="pb-28">
              {displayMenu.length === 0 && favouritesOnly ? (
                <EmptyFavouritesState />
              ) : (
                displayMenu.map((cat, i) => (
                  <div
                    key={cat.id}
                    ref={(el) => {
                      sectionRefs.current[cat.id] = el;
                    }}
                  >
                    {i > 0 && <div className="h-2 bg-brand-canvas" />}
                    <div className="px-4 pt-4">
                      {cat.name && (
                        <h3 className="text-[20px] font-bold text-brand-ink mb-1">
                          {cat.name}
                        </h3>
                      )}
                      {cat.items.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          available={isItemAvailable(item.id)}
                          isFavourite={dishFavourites.has(item.id)}
                          onToggleFavourite={() => toggleFav(item.id)}
                          onPick={() =>
                            isItemAvailable(item.id)
                              ? go({ name: "item", itemId: item.id })
                              : undefined
                          }
                        />
                      ))}
                      {cat.note && (
                        <p className="text-[12px] text-brand-muted italic pt-2 pb-1">
                          {cat.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>

          {/* Top bar — absolute over the scroll area; transparent overlay before threshold, solid after */}
          <div
            className="absolute top-0 left-0 right-0 z-20"
            style={{
              background: scrolled
                ? "rgba(255, 255, 255, 0.96)"
                : "transparent",
              backdropFilter: scrolled ? "saturate(1.5) blur(8px)" : "none",
              WebkitBackdropFilter: scrolled
                ? "saturate(1.5) blur(8px)"
                : "none",
              borderBottom: scrolled
                ? "1px solid rgb(243, 244, 246)"
                : "1px solid transparent",
              transition: "background-color 180ms ease, border-color 180ms ease",
            }}
          >
            <div className="flex items-center px-4 pt-4 pb-2 gap-2">
              <button
                onClick={backToDiscovery}
                aria-label="Back to all restaurants"
                className="p-1 -ml-1"
              >
                <BackIcon className="w-6 h-6 text-brand-ink" />
              </button>
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu categories"
                className="p-1"
              >
                <MenuIcon className="w-6 h-6 text-brand-ink" />
              </button>
              <div
                className={
                  "flex-1 text-center transition-opacity duration-150 pointer-events-none " +
                  (scrolled ? "opacity-100" : "opacity-0")
                }
              >
                <h1 className="text-[15px] font-semibold text-brand-ink leading-tight">
                  {venue.name}
                </h1>
                <div className="text-[11px] text-brand-muted leading-tight">
                  {venue.address.split(",")[0].trim()}
                </div>
              </div>
              <button
                aria-label={
                  favouritesOnly
                    ? "Show full menu"
                    : "Show favourite dishes only"
                }
                aria-pressed={favouritesOnly}
                className="p-1"
                onClick={() => setFavouritesOnly((v) => !v)}
              >
                <HeartIcon
                  filled={favouritesOnly}
                  className={
                    "w-6 h-6 " +
                    (favouritesOnly ? "text-rose-500" : "text-brand-ink")
                  }
                />
              </button>
              <button
                aria-label="Search"
                className="p-1 -mr-1"
                onClick={() => setSearching(true)}
              >
                <SearchIcon className="w-6 h-6 text-brand-ink" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* View-cart pill */}
      {itemCount > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
          <button
            onClick={() => go({ name: "cart" })}
            className="pointer-events-auto w-full bg-brand-ink text-white rounded-full py-3.5 px-5 flex items-center justify-between font-semibold shadow-[0_6px_30px_rgba(0,0,0,0.25)]"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-green text-white text-[13px] font-bold">
              {itemCount}
            </span>
            <span>View cart</span>
            <span>{formatRM(subtotal)}</span>
          </button>
        </div>
      )}

      {/* Category drawer */}
      {drawerOpen && (
        <CategoryDrawer
          menu={displayMenu}
          etaLabel={`${venue.estimatedDeliveryMinutes[0]}–${venue.estimatedDeliveryMinutes[1]} min`}
          activeCat={activeCat}
          onClose={() => setDrawerOpen(false)}
          onPick={(id) => {
            setDrawerOpen(false);
            pickCategory(id);
          }}
        />
      )}

      {reorderToast && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-brand-ink text-white rounded-full px-4 py-2 text-[12.5px] font-semibold shadow-lg z-30"
          style={{ animation: "slideUp 0.22s ease-out" }}
        >
          {reorderToast}
        </div>
      )}

      {reorderSheetOpen && (
        <ReorderSheet
          orders={recentCollected}
          onPick={(o) => {
            setReorderSheetOpen(false);
            reorder(o);
          }}
          onClose={() => setReorderSheetOpen(false)}
        />
      )}
    </div>
  );
}

function ReorderSheet({
  orders,
  onPick,
  onClose,
}: {
  orders: Order[];
  onPick: (o: Order) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/50">
      <div
        className="bg-white w-full rounded-t-2xl shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold text-brand-ink">
              Reorder
            </div>
            <div className="text-[11.5px] text-brand-muted">
              Pick a past order to load into your cart.
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <ul className="max-h-[55vh] overflow-y-auto">
          {orders.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => onPick(o)}
                className="w-full text-left px-5 py-3 border-b border-gray-50 hover:bg-brand-canvas/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11.5px] font-semibold text-brand-muted uppercase tracking-wide">
                    {reorderDateLabel(o.collectedAt ?? o.placedAt)}
                  </span>
                  <span className="text-[13px] font-bold text-brand-ink tabular-nums">
                    {formatRM(o.total)}
                  </span>
                </div>
                <div className="text-[13.5px] text-brand-ink leading-snug">
                  {reorderItemLabel(o)}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-brand-canvas text-brand-ink rounded-full py-3 font-semibold text-[14px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function findMenuItem(
  menu: MenuCategory[],
  id: string,
  name: string,
): MenuItem | null {
  const wantedName = name.toLowerCase();
  for (const cat of menu) {
    for (const item of cat.items) {
      if (item.id === id) return item;
      if (item.name.toLowerCase() === wantedName) return item;
    }
  }
  return null;
}

function reconstructSelections(
  item: MenuItem,
  modifierLabels: string[],
): Selections {
  const selections: Selections = {};
  if (!item.modifierGroups) return selections;
  for (const g of item.modifierGroups) {
    if (g.multi) {
      const matches: string[] = [];
      for (const label of modifierLabels) {
        const opt = g.options.find((o) => o.label === label);
        if (opt && !matches.includes(opt.id)) matches.push(opt.id);
      }
      selections[g.id] = matches;
    } else {
      const found = modifierLabels
        .map((l) => g.options.find((o) => o.label === l))
        .find((o): o is (typeof g.options)[number] => Boolean(o));
      if (found) {
        selections[g.id] = [found.id];
      } else if (g.required && g.options[0]) {
        selections[g.id] = [g.options[0].id];
      } else {
        selections[g.id] = [];
      }
    }
  }
  return selections;
}

function reorderDateLabel(ts: number, now = Date.now()): string {
  const order = new Date(ts);
  const today = new Date(now);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOfDay(today) - startOfDay(order)) / (24 * 3_600_000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return order.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function reorderItemLabel(order: Order): string {
  const names = order.lines.map((l) => l.itemName);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(" · ");
  return `${names[0]}, ${names[1]}, +${names.length - 2}`;
}

function EmptyFavouritesState() {
  return (
    <div className="px-6 pt-12 pb-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-3">
        <HeartIcon className="w-6 h-6 text-rose-400" />
      </div>
      <div className="text-[16px] font-semibold text-brand-ink mb-1">
        No favourite dishes yet
      </div>
      <div className="text-[13px] text-brand-muted leading-snug">
        Tap the heart on any dish — it'll show up here for instant access next time.
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onPick,
  isFavourite,
  onToggleFavourite,
  available = true,
}: {
  item: MenuItem;
  onPick: () => void;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  available?: boolean;
}) {
  /* Whole row is the open-detail target. The heart is a separate tap target
     nested inside; stopPropagation keeps a fav-toggle from also navigating. */
  return (
    <div
      className={
        "relative w-full py-4 border-b border-gray-100 flex items-start gap-3 " +
        (available ? "" : "opacity-90")
      }
    >
      <button
        onClick={available ? onPick : undefined}
        disabled={!available}
        className={
          "flex-1 min-w-0 text-left flex items-start gap-3 " +
          (available ? "" : "cursor-not-allowed")
        }
      >
        <div className="flex-1 min-w-0 pr-2">
          <div
            className={
              "font-semibold text-[15px] flex items-center gap-2 " +
              (available ? "text-brand-ink" : "text-brand-muted")
            }
          >
            {item.name}
            {item.badge && (
              <span className="inline-block bg-brand-green/10 text-brand-green text-[10px] font-semibold px-1.5 py-0.5 rounded">
                {item.badge}
              </span>
            )}
            {!available && (
              <span className="inline-block bg-gray-200 text-brand-muted text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide">
                Sold out
              </span>
            )}
          </div>
          <div
            className={
              "text-[14px] mt-0.5 " +
              (available ? "text-brand-ink" : "text-brand-muted line-through")
            }
          >
            {formatRM(item.price)}
            {item.modifierGroups?.some((g) => g.kind === "size") && (
              <span className="text-brand-muted text-[12px]"> · from</span>
            )}
          </div>
          {item.description && (
            <p
              className={
                "text-[13px] leading-snug mt-1 line-clamp-2 " +
                (available ? "text-brand-muted" : "text-brand-muted/70")
              }
            >
              {item.description}
            </p>
          )}
        </div>
        {item.image && (
          <div
            className={
              "flex-shrink-0 pt-1 " +
              (available ? "" : "opacity-30 grayscale")
            }
          >
            <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-brand-canvas">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </button>
      {/* Heart toggle — top-3 right-1.5 in both variants so the y-axis lines
          up with the title row regardless of whether the item has an image. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavourite();
        }}
        aria-label={isFavourite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
        aria-pressed={isFavourite}
        className={
          "absolute top-3 right-1.5 w-7 h-7 rounded-full flex items-center justify-center " +
          (item.image ? "bg-white/95 shadow-md" : "")
        }
      >
        <HeartIcon
          filled={isFavourite}
          className={
            "w-4 h-4 " +
            (isFavourite ? "text-rose-500" : "text-brand-ink/70")
          }
        />
      </button>
    </div>
  );
}

function SearchBody({
  query,
  results,
  dishFavourites,
  onToggleFavourite,
  onPick,
}: {
  query: string;
  results: { item: MenuItem; categoryName: string }[];
  dishFavourites: Set<string>;
  onToggleFavourite: (id: string) => void;
  onPick: (id: string) => void;
}) {
  const { isItemAvailable } = useStock();
  const hasQuery = query.trim().length > 0;
  if (hasQuery && results.length === 0) {
    return (
      <div className="px-5 pt-10 text-center text-brand-muted text-[14px]">
        No matches for <span className="text-brand-ink font-semibold">"{query}"</span>
      </div>
    );
  }
  const grouped = new Map<string, MenuItem[]>();
  for (const r of results) {
    if (!grouped.has(r.categoryName)) grouped.set(r.categoryName, []);
    grouped.get(r.categoryName)!.push(r.item);
  }
  return (
    <section className="px-4 pt-3 pb-28">
      {hasQuery && (
        <div className="text-[12px] text-brand-muted pb-2">
          {results.length} {results.length === 1 ? "result" : "results"}
        </div>
      )}
      {Array.from(grouped.entries()).map(([categoryName, items]) => (
        <div key={categoryName || "_ungrouped"} className="mb-2">
          {categoryName && (
            <h3 className="text-[13px] font-semibold text-brand-muted uppercase tracking-wide pt-3 pb-1">
              {categoryName}
            </h3>
          )}
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              available={isItemAvailable(item.id)}
              isFavourite={dishFavourites.has(item.id)}
              onToggleFavourite={() => onToggleFavourite(item.id)}
              onPick={() => onPick(item.id)}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

function CategoryDrawer({
  menu,
  etaLabel,
  activeCat,
  onClose,
  onPick,
}: {
  menu: MenuCategory[];
  etaLabel: string;
  activeCat: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const totalItems = useMemo(
    () => menu.reduce((s, c) => s + c.items.length, 0),
    [menu],
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      <button
        aria-label="Close category menu"
        onClick={onClose}
        className="flex-1 bg-black/50"
      />
      <div className="bg-white rounded-t-2xl animate-[slideUp_0.22s_ease-out]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={onClose} aria-label="Close" className="relative z-10">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
          <div className="flex-1 text-center -ml-6 pointer-events-none">
            <div className="text-[17px] font-bold text-brand-ink">Menu</div>
            <div className="text-[12px] text-brand-muted">
              {totalItems} items · {etaLabel}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 max-h-[60vh] overflow-y-auto">
          {menu
            .filter((cat) => cat.name)
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => onPick(cat.id)}
                className={
                  "w-full text-left px-5 py-4 border-b border-gray-50 " +
                  (cat.id === activeCat
                    ? "text-brand-ink font-bold"
                    : "text-brand-ink/80 font-medium")
                }
              >
                {cat.name}
                <span className="text-brand-muted font-normal ml-2 text-[13px]">
                  ({cat.items.length})
                </span>
              </button>
            ))}
        </div>
        <div className="p-3 pb-5 safe-area-bottom">
          <button
            onClick={onClose}
            className="w-full bg-brand-ink text-white rounded-full py-3.5 font-semibold"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ venueName }: { venueName: string }) {
  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex items-center px-4 pt-4 pb-3 border-b border-gray-100">
        <button
          onClick={backToDiscovery}
          aria-label="Back to discovery"
          className="p-1 -ml-1"
        >
          <BackIcon className="w-6 h-6 text-brand-ink" />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-semibold text-brand-ink">
          {venueName}
        </h1>
        <div className="w-6" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-[64px] mb-4" aria-hidden>
          🛠️
        </div>
        <div className="text-[20px] font-extrabold text-brand-ink leading-tight">
          Menu coming soon
        </div>
        <div className="text-[13.5px] text-brand-muted mt-2 leading-relaxed">
          {venueName} is finalising their dishes on Tapow. Check back soon —
          we're onboarding new restaurants every week.
        </div>
        <button
          onClick={backToDiscovery}
          className="mt-7 bg-brand-ink text-white rounded-full px-6 py-2.5 font-semibold text-[14px]"
        >
          Browse other restaurants
        </button>
      </div>
    </div>
  );
}
