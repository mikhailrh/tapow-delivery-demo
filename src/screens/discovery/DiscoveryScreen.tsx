import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  VENUE_LIST,
  type Cuisine,
  type Venue,
} from "../../data/venues";
import { formatRM } from "../../lib/money";
import {
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  EyeSlashIcon,
  HeartIcon,
  HomeIcon,
  KebabIcon,
  PinIcon,
  SearchIcon,
  ShoppingBagIcon,
  SortIcon,
  StarIcon,
  TagIcon,
  UserIcon,
} from "../../components/icons";
import SearchOverlay from "./SearchOverlay";
import {
  CUISINE_TILES,
  buildNotifications,
  buildOrderAgainList,
  readFavourites,
  readHidden,
  relativeTimeFrom,
  writeFavourites,
  writeHidden,
  type NotificationEntry,
  type OrderAgainEntry,
} from "./shared";

type SortKey =
  | "recommended"
  | "rating"
  | "delivery-time"
  | "delivery-fee";

const SORT_LABELS: Record<SortKey, string> = {
  recommended: "Recommended",
  rating: "Top rated",
  "delivery-time": "Fastest first",
  "delivery-fee": "Lowest delivery fee",
};

const SCROLL_KEY = "tapow.discovery.scroll";

function saveScroll(top: number) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SCROLL_KEY, String(top));
  } catch {
    /* ignore */
  }
}

function readSavedScroll(): number {
  if (typeof sessionStorage === "undefined") return 0;
  const raw = sessionStorage.getItem(SCROLL_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function navigateToVenue(slug: string, scrollTop: number) {
  if (typeof window === "undefined") return;
  saveScroll(scrollTop);
  window.location.assign(`/v/${slug}`);
}

function isFreeDelivery(v: Venue): boolean {
  return (
    v.deliveryFee === 0 ||
    (v.hasOffer?.label.toLowerCase().includes("free delivery") ?? false)
  );
}

function sortVenues(
  list: Venue[],
  sortBy: SortKey,
  pickupMode: boolean,
): Venue[] {
  const sorted = list.slice();
  const speedKey = (v: Venue) =>
    pickupMode ? v.kitchenPrepDefaultMinutes : v.estimatedDeliveryMinutes[0];
  // Always anchor closed venues to the bottom regardless of sort key.
  sorted.sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating;
      case "delivery-time":
        return speedKey(a) - speedKey(b);
      case "delivery-fee":
        return a.deliveryFee - b.deliveryFee;
      case "recommended":
      default:
        return b.rating - a.rating;
    }
  });
  return sorted;
}

export default function DiscoveryScreen() {
  const [cuisineFilter, setCuisineFilter] = useState<Cuisine | null>(null);
  const [under30, setUnder30] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [pickupMode, setPickupMode] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [modeSheetOpen, setModeSheetOpen] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(() =>
    readFavourites(),
  );
  const [hidden, setHidden] = useState<Record<string, number>>(() =>
    readHidden(),
  );
  const [actionVenue, setActionVenue] = useState<Venue | null>(null);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [inlineSearch, setInlineSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* Mode (delivery/pickup) is a state, not a filter — Order Again and the
     inline search both stay irrelevant to it. */
  const anyFilterActive =
    favouritesOnly ||
    cuisineFilter !== null ||
    topRatedOnly ||
    freeDeliveryOnly ||
    under30 ||
    offersOnly;

  /* Reset the inline query whenever filters clear so it doesn't persist as a
     hidden constraint the user has no UI to see. */
  useEffect(() => {
    if (!anyFilterActive && inlineSearch) setInlineSearch("");
  }, [anyFilterActive, inlineSearch]);

  const toggleFavourite = (slug: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      writeFavourites(next);
      return next;
    });
  };
  const hideVenue = (slug: string) => {
    setHidden((prev) => {
      const next = { ...prev, [slug]: Date.now() };
      writeHidden(next);
      return next;
    });
  };

  const orderAgain = useMemo(() => buildOrderAgainList(), []);
  // Re-read whenever the bell is opened so a freshly-placed order shows up.
  const notifications = useMemo<NotificationEntry[]>(
    () => (notifSheetOpen ? buildNotifications() : []),
    [notifSheetOpen],
  );
  const unreadCount = useMemo(() => {
    const fresh = buildNotifications();
    return fresh.filter(
      (n) =>
        n.status === "incoming" ||
        n.status === "cooking" ||
        n.status === "ready",
    ).length;
  }, []);

  useLayoutEffect(() => {
    const saved = readSavedScroll();
    if (saved > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = saved;
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        saveScroll(el.scrollTop);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const goToVenue = (slug: string) => {
    navigateToVenue(slug, scrollRef.current?.scrollTop ?? 0);
  };

  const filteredVenues = useMemo(() => {
    let list = VENUE_LIST.slice().filter((v) => !(v.slug in hidden));
    if (favouritesOnly) list = list.filter((v) => favourites.has(v.slug));
    if (cuisineFilter) list = list.filter((v) => v.cuisine === cuisineFilter);
    if (under30) {
      list = list.filter((v) =>
        pickupMode
          ? v.kitchenPrepDefaultMinutes <= 30
          : v.estimatedDeliveryMinutes[1] <= 30,
      );
    }
    if (offersOnly) list = list.filter((v) => v.hasOffer);
    if (topRatedOnly) list = list.filter((v) => v.rating >= 4.7);
    if (freeDeliveryOnly) list = list.filter(isFreeDelivery);
    /* Inline narrow-search runs last so it works on the already-filtered set.
       Only applies when at least one other filter is active — otherwise we
       wouldn't have shown the input at all. */
    const q = inlineSearch.trim().toLowerCase();
    if (anyFilterActive && q) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.cuisine.toLowerCase().includes(q) ||
          (v.tagline ?? "").toLowerCase().includes(q),
      );
    }
    return sortVenues(list, sortBy, pickupMode);
  }, [
    hidden,
    favouritesOnly,
    favourites,
    cuisineFilter,
    under30,
    offersOnly,
    topRatedOnly,
    freeDeliveryOnly,
    pickupMode,
    sortBy,
    inlineSearch,
    anyFilterActive,
  ]);

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="sticky top-0 z-20 bg-white">
        <LocationBar
          unreadCount={unreadCount}
          onBellTap={() => setNotifSheetOpen(true)}
          favouritesOnly={favouritesOnly}
          onFavouritesTap={() => setFavouritesOnly((v) => !v)}
        />
        <FilterChipsRow
          pickupMode={pickupMode}
          onModeTap={() => setModeSheetOpen(true)}
          under30={under30}
          setUnder30={setUnder30}
          topRatedOnly={topRatedOnly}
          setTopRatedOnly={setTopRatedOnly}
          freeDeliveryOnly={freeDeliveryOnly}
          setFreeDeliveryOnly={setFreeDeliveryOnly}
          offersOnly={offersOnly}
          setOffersOnly={setOffersOnly}
          sortBy={sortBy}
          onSortTap={() => setSortSheetOpen(true)}
        />
        {anyFilterActive && (
          <InlineSearchInput
            value={inlineSearch}
            onChange={setInlineSearch}
            resultCount={filteredVenues.length}
          />
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32">
        <CuisineTileRow
          selected={cuisineFilter}
          onSelect={(c) =>
            setCuisineFilter((prev) => (prev === c ? null : c))
          }
        />
        {orderAgain.length > 0 && !anyFilterActive && (
          <OrderAgainRail entries={orderAgain} onPick={goToVenue} />
        )}
        <RestaurantList
          venues={filteredVenues}
          totalCount={VENUE_LIST.length - Object.keys(hidden).length}
          activeFilter={cuisineFilter}
          topRatedOnly={topRatedOnly}
          freeDeliveryOnly={freeDeliveryOnly}
          favouritesOnly={favouritesOnly}
          favouritesCount={favourites.size}
          pickupMode={pickupMode}
          favourites={favourites}
          onCardActions={(v) => setActionVenue(v)}
          clearFilter={() => {
            setCuisineFilter(null);
            setTopRatedOnly(false);
            setFreeDeliveryOnly(false);
          }}
          onPick={goToVenue}
        />
      </div>

      <BottomBar onSearchTap={() => setSearchOpen(true)} />

      {searchOpen && (
        <SearchOverlay
          scopedSlugs={favouritesOnly ? favourites : null}
          scopeLabel={favouritesOnly ? "favourites" : null}
          onClose={() => setSearchOpen(false)}
          onSelectCuisine={(c) => {
            setCuisineFilter(c);
            setSearchOpen(false);
            scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      )}

      {sortSheetOpen && (
        <SortSheet
          value={sortBy}
          pickupMode={pickupMode}
          onPick={(key) => {
            setSortBy(key);
            setSortSheetOpen(false);
          }}
          onClose={() => setSortSheetOpen(false)}
        />
      )}

      {modeSheetOpen && (
        <ModeSheet
          pickupMode={pickupMode}
          onPick={(pickup) => {
            setPickupMode(pickup);
            setModeSheetOpen(false);
          }}
          onClose={() => setModeSheetOpen(false)}
        />
      )}

      {actionVenue && (
        <CardActionSheet
          venue={actionVenue}
          isFavourite={favourites.has(actionVenue.slug)}
          onToggleFavourite={() => {
            toggleFavourite(actionVenue.slug);
            setActionVenue(null);
          }}
          onHide={() => {
            hideVenue(actionVenue.slug);
            setActionVenue(null);
          }}
          onClose={() => setActionVenue(null)}
        />
      )}

      {notifSheetOpen && (
        <NotificationsSheet
          entries={notifications}
          onPick={(slug) => {
            setNotifSheetOpen(false);
            goToVenue(slug);
          }}
          onClose={() => setNotifSheetOpen(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                            Top bar                                 */
/* ------------------------------------------------------------------ */

function LocationBar({
  unreadCount,
  onBellTap,
  favouritesOnly,
  onFavouritesTap,
}: {
  unreadCount: number;
  onBellTap: () => void;
  favouritesOnly: boolean;
  onFavouritesTap: () => void;
}) {
  return (
    <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
      <button className="flex items-center gap-1.5 -ml-1 px-1 text-left min-w-0">
        <PinIcon className="w-5 h-5 text-brand-green flex-shrink-0" />
        <span className="text-[16px] font-bold text-brand-ink leading-none truncate">
          Home
        </span>
        <ChevronDownIcon className="w-4 h-4 text-brand-ink flex-shrink-0" />
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onFavouritesTap}
          aria-label={favouritesOnly ? "Show all restaurants" : "Show favourites"}
          aria-pressed={favouritesOnly}
          className={
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors " +
            (favouritesOnly
              ? "bg-rose-50 text-rose-500"
              : "bg-brand-canvas text-brand-ink")
          }
        >
          <HeartIcon filled={favouritesOnly} className="w-5 h-5" />
        </button>
        <button
          onClick={onBellTap}
          aria-label="Notifications"
          className="relative w-10 h-10 rounded-full bg-brand-canvas flex items-center justify-center"
        >
          <BellIcon className="w-5 h-5 text-brand-ink" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function FilterChipsRow({
  pickupMode,
  onModeTap,
  under30,
  setUnder30,
  topRatedOnly,
  setTopRatedOnly,
  freeDeliveryOnly,
  setFreeDeliveryOnly,
  offersOnly,
  setOffersOnly,
  sortBy,
  onSortTap,
}: {
  pickupMode: boolean;
  onModeTap: () => void;
  under30: boolean;
  setUnder30: (v: boolean) => void;
  topRatedOnly: boolean;
  setTopRatedOnly: (v: boolean) => void;
  freeDeliveryOnly: boolean;
  setFreeDeliveryOnly: (v: boolean) => void;
  offersOnly: boolean;
  setOffersOnly: (v: boolean) => void;
  sortBy: SortKey;
  onSortTap: () => void;
}) {
  const sortActive = sortBy !== "recommended";
  return (
    <div className="px-4 pb-3 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-2 w-max">
        {/* Mode chip — dropdown style, exact-one selected. Dark when pickup is
            on (non-default) so the mode shift reads at a glance. */}
        <Chip active={pickupMode} onClick={onModeTap}>
          <span aria-hidden>{pickupMode ? "🛍️" : "🛵"}</span>
          {pickupMode ? "Pickup" : "Delivery"}
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </Chip>
        <Chip active={sortActive} onClick={onSortTap}>
          <SortIcon className="w-3.5 h-3.5" />
          {sortActive ? SORT_LABELS[sortBy] : "Sort by"}
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </Chip>
        <Chip active={under30} onClick={() => setUnder30(!under30)}>
          Under 30 min
        </Chip>
        <Chip
          active={topRatedOnly}
          onClick={() => setTopRatedOnly(!topRatedOnly)}
        >
          <span aria-hidden>⭐</span>
          Top rated
        </Chip>
        <Chip
          active={freeDeliveryOnly}
          onClick={() => setFreeDeliveryOnly(!freeDeliveryOnly)}
        >
          Free delivery
        </Chip>
        <Chip active={offersOnly} onClick={() => setOffersOnly(!offersOnly)}>
          <TagIcon className="w-3.5 h-3.5" />
          Offers
        </Chip>
      </div>
    </div>
  );
}

/**
 * Inline "narrow this list" search input. Shown beneath the filter chip row
 * only when at least one filter is active — the bottom-rail search still
 * exists for the full-pool search-across-menus overlay; this is the lighter
 * "I already filtered, now type to narrow what I see" affordance that lets
 * the user keep eyes on the list as they type.
 */
function InlineSearchInput({
  value,
  onChange,
  resultCount,
}: {
  value: string;
  onChange: (v: string) => void;
  resultCount: number;
}) {
  const placeholder = `Narrow ${resultCount} restaurant${resultCount === 1 ? "" : "s"}…`;
  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2 bg-brand-canvas rounded-full px-3.5 py-2">
        <SearchIcon className="w-4 h-4 text-brand-muted flex-shrink-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[13px] text-brand-ink placeholder:text-brand-muted min-w-0"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="p-0.5 flex-shrink-0"
          >
            <CloseIcon className="w-4 h-4 text-brand-muted" />
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors whitespace-nowrap " +
        (active
          ? "bg-brand-ink text-white border-brand-ink"
          : "bg-white text-brand-ink border-gray-200")
      }
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*                         Cuisine tiles                              */
/* ------------------------------------------------------------------ */

function CuisineTileRow({
  selected,
  onSelect,
}: {
  selected: Cuisine | null;
  onSelect: (c: Cuisine) => void;
}) {
  return (
    <div className="pt-4 pb-2 overflow-x-auto scrollbar-none">
      <div className="flex items-stretch gap-3 px-4 w-max">
        {CUISINE_TILES.map((t) => {
          const active = selected === t.cuisine;
          return (
            <button
              key={t.cuisine + t.label}
              onClick={() => onSelect(t.cuisine)}
              className="flex flex-col items-center gap-1.5 w-16"
            >
              <span
                className={
                  "w-14 h-14 rounded-full flex items-center justify-center text-[26px] transition-all " +
                  (active
                    ? "bg-brand-green/15 ring-2 ring-brand-green"
                    : "bg-brand-canvas")
                }
                aria-hidden
              >
                {t.emoji}
              </span>
              <span
                className={
                  "text-[11.5px] font-semibold leading-tight text-center " +
                  (active ? "text-brand-green" : "text-brand-ink")
                }
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       Order Again rail                             */
/* ------------------------------------------------------------------ */

function OrderAgainRail({
  entries,
  onPick,
}: {
  entries: OrderAgainEntry[];
  onPick: (slug: string) => void;
}) {
  return (
    <div className="pt-1 pb-5">
      <div className="px-4 flex items-center justify-between mb-3">
        <h2 className="text-[18px] font-extrabold text-brand-ink">
          Order Again
        </h2>
        <button
          aria-label="See all"
          className="w-7 h-7 rounded-full bg-brand-canvas flex items-center justify-center"
        >
          <ChevronRightIcon className="w-4 h-4 text-brand-ink" />
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex items-stretch gap-3 px-4 w-max">
          {entries.map(({ venue, lastOrderedAt }) => (
            <button
              key={venue.slug}
              onClick={() => onPick(venue.slug)}
              className="w-[180px] flex-shrink-0 text-left"
            >
              <div className="rounded-xl overflow-hidden bg-brand-canvas aspect-[4/3] mb-2">
                <img
                  src={venue.heroImage}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="text-[13.5px] font-bold text-brand-ink leading-tight truncate">
                {venue.name}
              </div>
              <div className="text-[11.5px] text-brand-muted leading-tight mt-0.5">
                Last ordered {relativeTimeFrom(lastOrderedAt)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       Restaurant list                              */
/* ------------------------------------------------------------------ */

function RestaurantList({
  venues,
  totalCount,
  activeFilter,
  topRatedOnly,
  freeDeliveryOnly,
  favouritesOnly,
  favouritesCount,
  pickupMode,
  favourites,
  onCardActions,
  clearFilter,
  onPick,
}: {
  venues: Venue[];
  totalCount: number;
  activeFilter: Cuisine | null;
  topRatedOnly: boolean;
  freeDeliveryOnly: boolean;
  favouritesOnly: boolean;
  favouritesCount: number;
  pickupMode: boolean;
  favourites: Set<string>;
  onCardActions: (v: Venue) => void;
  clearFilter: () => void;
  onPick: (slug: string) => void;
}) {
  /* Compose heading. Favourites is a scope modifier — it appends to whatever
     other filter is active, or stands on its own. */
  let heading: string;
  if (favouritesOnly) {
    if (activeFilter) heading = `${activeFilter} favourites`;
    else if (topRatedOnly && !freeDeliveryOnly) heading = "Top rated favourites";
    else if (freeDeliveryOnly && !topRatedOnly) heading = "Free delivery favourites";
    else heading = "Favourites";
  } else if (activeFilter) {
    heading = `${activeFilter} restaurants`;
  } else if (topRatedOnly && !freeDeliveryOnly) {
    heading = "Top rated";
  } else if (freeDeliveryOnly && !topRatedOnly) {
    heading = "Free delivery";
  } else {
    heading = "All restaurants";
  }
  const showEmptyFavouritesHint =
    favouritesOnly && favouritesCount === 0;
  return (
    <div className="pt-1 pb-2">
      <div className="px-4 flex items-end justify-between mb-3">
        <h2 className="text-[18px] font-extrabold text-brand-ink">{heading}</h2>
        <div className="text-[12px] text-brand-muted">
          {venues.length} of {totalCount}
        </div>
      </div>
      {venues.length === 0 ? (
        showEmptyFavouritesHint ? (
          <div className="px-6 py-12 text-center">
            <div className="text-[15px] font-semibold text-brand-ink mb-1">
              No favourites yet
            </div>
            <div className="text-[13px] text-brand-muted">
              Tap the ⋯ on any restaurant and choose "Add to favourites" to save it here.
            </div>
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <div className="text-[14px] text-brand-muted mb-3">
              Nothing matches this filter.
            </div>
            <button
              onClick={clearFilter}
              className="text-brand-green font-semibold text-[14px]"
            >
              Clear filter
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-col">
          {venues.map((v, i) => (
            <RestaurantCard
              key={v.slug}
              venue={v}
              pickupMode={pickupMode}
              isFavourite={favourites.has(v.slug)}
              onPick={onPick}
              onActions={onCardActions}
              isLast={i === venues.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RestaurantCard({
  venue,
  pickupMode,
  isFavourite,
  onPick,
  onActions,
  isLast,
}: {
  venue: Venue;
  pickupMode: boolean;
  isFavourite: boolean;
  onPick: (slug: string) => void;
  onActions: (v: Venue) => void;
  isLast: boolean;
}) {
  const [eMin, eMax] = venue.estimatedDeliveryMinutes;
  const eta = eMin === eMax ? `${eMin} min` : `${eMin}–${eMax} min`;
  const fee =
    venue.deliveryFee === 0 ? "Free" : `${formatRM(venue.deliveryFee)} delivery`;
  const metaLine = pickupMode
    ? `Ready in ${venue.kitchenPrepDefaultMinutes} min · Pickup`
    : `${eta} · ${fee}`;

  return (
    <div
      className={
        "relative px-4 py-3 flex gap-3 items-start " +
        (isLast ? "" : "border-b border-gray-100")
      }
    >
      <button
        onClick={() => venue.isOpen && onPick(venue.slug)}
        disabled={!venue.isOpen}
        className="flex-1 min-w-0 text-left flex gap-3 items-start"
      >
        <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-brand-canvas">
          <img
            src={venue.heroImage}
            alt=""
            className={
              "w-full h-full object-cover " + (venue.isOpen ? "" : "opacity-40")
            }
            loading="lazy"
          />
          {venue.hasOffer && venue.isOpen && (
            <div
              className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white leading-tight max-w-[100px] truncate"
              style={{ background: venue.hasOffer.pillColor ?? "#DC2626" }}
            >
              {venue.hasOffer.label}
            </div>
          )}
          {isFavourite && (
            <div className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
              <HeartIcon
                filled
                className="w-3.5 h-3.5 text-rose-500"
              />
            </div>
          )}
          {!venue.isOpen && (
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold uppercase tracking-wide">
                Closed
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 py-0.5 pr-8">
          <div className="text-[15px] font-extrabold text-brand-ink leading-tight truncate">
            {venue.name}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-brand-muted mt-1">
            <StarIcon className="text-amber-500 w-3.5 h-3.5" />
            <span className="font-semibold text-brand-ink">
              {venue.rating.toFixed(1)}
            </span>
            <span>({formatRatingCount(venue.ratingCount)})</span>
            <Dot />
            <span>{"$".repeat(venue.priceTier)}</span>
            <Dot />
            <span className="truncate">{venue.cuisine}</span>
          </div>
          <div className="text-[12px] text-brand-muted mt-0.5 truncate">
            {metaLine}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onActions(venue);
        }}
        aria-label={`Actions for ${venue.name}`}
        className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center text-brand-muted hover:bg-black/5"
      >
        <KebabIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

function Dot() {
  return <span className="text-[10px] opacity-60">·</span>;
}

function formatRatingCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`;
  if (n >= 100) return `${Math.floor(n / 50) * 50}+`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/*                           Sort sheet                               */
/* ------------------------------------------------------------------ */

function SortSheet({
  value,
  pickupMode,
  onPick,
  onClose,
}: {
  value: SortKey;
  pickupMode: boolean;
  onPick: (k: SortKey) => void;
  onClose: () => void;
}) {
  const options: { key: SortKey; label: string; sub: string }[] = [
    {
      key: "recommended",
      label: "Recommended",
      sub: "Top rated, open now",
    },
    {
      key: "rating",
      label: "Rating",
      sub: "Highest first",
    },
    {
      key: "delivery-time",
      label: pickupMode ? "Pickup time" : "Delivery time",
      sub: "Fastest first",
    },
    ...(pickupMode
      ? []
      : [
          {
            key: "delivery-fee" as SortKey,
            label: "Delivery fee",
            sub: "Lowest first",
          },
        ]),
  ];
  useEscapeToClose(onClose);
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/40">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        className="relative bg-white w-full rounded-t-2xl pb-7"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="text-[18px] font-bold text-brand-ink">Sort by</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 -mt-1"
          >
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="flex flex-col">
          {options.map((opt) => {
            const selected = opt.key === value;
            return (
              <button
                key={opt.key}
                onClick={() => onPick(opt.key)}
                className="flex items-center justify-between gap-3 px-5 py-3.5 active:bg-brand-canvas text-left"
              >
                <div>
                  <div className="text-[15px] font-semibold text-brand-ink leading-tight">
                    {opt.label}
                  </div>
                  <div className="text-[12.5px] text-brand-muted leading-tight mt-0.5">
                    {opt.sub}
                  </div>
                </div>
                {selected && (
                  <CheckIcon className="w-5 h-5 text-brand-green flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                            Mode sheet                              */
/* ------------------------------------------------------------------ */

function ModeSheet({
  pickupMode,
  onPick,
  onClose,
}: {
  pickupMode: boolean;
  onPick: (pickup: boolean) => void;
  onClose: () => void;
}) {
  useEscapeToClose(onClose);
  const options: { value: boolean; label: string; sub: string; emoji: string }[] =
    [
      {
        value: false,
        label: "Delivery",
        sub: "Brought to your door",
        emoji: "🛵",
      },
      {
        value: true,
        label: "Pickup",
        sub: "Collect from the venue",
        emoji: "🛍️",
      },
    ];
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/40">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        className="relative bg-white w-full rounded-t-2xl pb-7"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="text-[18px] font-bold text-brand-ink">
            How would you like it?
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 -mt-1"
          >
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="flex flex-col">
          {options.map((opt) => {
            const selected = opt.value === pickupMode;
            return (
              <button
                key={opt.label}
                onClick={() => onPick(opt.value)}
                className="flex items-center justify-between gap-3 px-5 py-3.5 active:bg-brand-canvas text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[22px] leading-none" aria-hidden>
                    {opt.emoji}
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-brand-ink leading-tight">
                      {opt.label}
                    </div>
                    <div className="text-[12.5px] text-brand-muted leading-tight mt-0.5">
                      {opt.sub}
                    </div>
                  </div>
                </div>
                {selected && (
                  <CheckIcon className="w-5 h-5 text-brand-green flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         Card action sheet                          */
/* ------------------------------------------------------------------ */

function CardActionSheet({
  venue,
  isFavourite,
  onToggleFavourite,
  onHide,
  onClose,
}: {
  venue: Venue;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  onHide: () => void;
  onClose: () => void;
}) {
  useEscapeToClose(onClose);
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/40">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        className="relative bg-white w-full rounded-t-2xl pb-7"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-brand-ink truncate">
              {venue.name}
            </div>
            <div className="text-[12.5px] text-brand-muted">
              {venue.cuisine} · {"$".repeat(venue.priceTier)}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 -mt-1 flex-shrink-0"
          >
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="flex flex-col">
          <button
            onClick={onToggleFavourite}
            className="flex items-center gap-3 px-5 py-3.5 active:bg-brand-canvas text-left"
          >
            <HeartIcon
              filled={isFavourite}
              className={
                "w-5 h-5 flex-shrink-0 " +
                (isFavourite ? "text-rose-500" : "text-brand-ink")
              }
            />
            <span className="text-[15px] font-semibold text-brand-ink">
              {isFavourite ? "Remove from favourites" : "Add to favourites"}
            </span>
          </button>
          <button
            onClick={onHide}
            className="flex items-start gap-3 px-5 py-3.5 active:bg-brand-canvas text-left"
          >
            <EyeSlashIcon className="w-5 h-5 text-brand-ink flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[15px] font-semibold text-brand-ink leading-tight">
                Hide this restaurant
              </div>
              <div className="text-[12.5px] text-brand-muted leading-tight mt-0.5">
                You won't see it for 30 days
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       Notifications sheet                          */
/* ------------------------------------------------------------------ */

function statusPill(status: NotificationEntry["status"]): {
  label: string;
  bg: string;
  fg: string;
} | null {
  switch (status) {
    case "incoming":
      return { label: "Incoming", bg: "bg-blue-50", fg: "text-blue-700" };
    case "cooking":
      return { label: "Cooking", bg: "bg-amber-50", fg: "text-amber-700" };
    case "ready":
      return { label: "Ready", bg: "bg-emerald-50", fg: "text-emerald-700" };
    case "collected":
      return { label: "Collected", bg: "bg-brand-canvas", fg: "text-brand-muted" };
    case "rejected":
      return { label: "Rejected", bg: "bg-rose-50", fg: "text-rose-700" };
    case "cancelled":
      return { label: "Cancelled", bg: "bg-rose-50", fg: "text-rose-700" };
  }
}

function NotificationsSheet({
  entries,
  onPick,
  onClose,
}: {
  entries: NotificationEntry[];
  onPick: (slug: string) => void;
  onClose: () => void;
}) {
  useEscapeToClose(onClose);
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/40">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        className="relative bg-white w-full rounded-t-2xl pb-7 max-h-[80%] flex flex-col"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="text-[18px] font-bold text-brand-ink">Notifications</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 -mt-1"
          >
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        {entries.length === 0 ? (
          <div className="px-5 pb-8 pt-6 text-center">
            <div className="text-[15px] font-semibold text-brand-ink mb-1">
              No notifications yet
            </div>
            <div className="text-[13px] text-brand-muted">
              You'll see order updates here once you place an order.
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto">
            {entries.map((n, i) => {
              const pill = statusPill(n.status);
              return (
                <button
                  key={`${n.venueSlug}-${n.orderShortId}-${i}`}
                  onClick={() => onPick(n.venueSlug)}
                  className="w-full flex items-start gap-3 px-5 py-3.5 active:bg-brand-canvas text-left border-t border-gray-100"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-canvas flex-shrink-0 flex items-center justify-center mt-0.5">
                    {n.fromVendor ? "💬" : "🛵"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-brand-ink leading-tight">
                        {n.venueName}
                      </span>
                      {pill && (
                        <span
                          className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${pill.bg} ${pill.fg}`}
                        >
                          {pill.label}
                        </span>
                      )}
                      <span className="text-[11px] text-brand-muted">
                        #{n.orderShortId}
                      </span>
                    </div>
                    <div className="text-[12.5px] text-brand-ink/80 leading-snug mt-0.5 line-clamp-2">
                      {n.text}
                    </div>
                    <div className="text-[11px] text-brand-muted mt-0.5">
                      {relativeTimeFrom(n.at)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

/* ------------------------------------------------------------------ */
/*                           Bottom bar                               */
/* ------------------------------------------------------------------ */

function BottomBar({ onSearchTap }: { onSearchTap: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-2 bg-gradient-to-t from-white via-white to-transparent">
      <div className="bg-white rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 flex items-center justify-between gap-1 px-2 py-1.5">
        <BottomIcon
          ariaLabel="Home"
          icon={<HomeIcon className="w-5 h-5" />}
          active
        />
        <BottomIcon
          ariaLabel="Locations"
          icon={<PinIcon className="w-5 h-5" />}
        />
        <button
          onClick={onSearchTap}
          className="flex-1 mx-1 flex items-center justify-center gap-2 bg-brand-canvas rounded-full py-2.5 text-brand-muted"
        >
          <SearchIcon className="w-4 h-4" />
          <span className="text-[13px] font-semibold">Search</span>
        </button>
        <BottomIcon
          ariaLabel="Cart"
          icon={<ShoppingBagIcon className="w-5 h-5" />}
        />
        <BottomIcon
          ariaLabel="Profile"
          icon={<UserIcon className="w-5 h-5" />}
        />
      </div>
    </div>
  );
}

function BottomIcon({
  icon,
  ariaLabel,
  active,
}: {
  icon: React.ReactNode;
  ariaLabel: string;
  active?: boolean;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={
        "w-9 h-9 rounded-full flex items-center justify-center " +
        (active ? "text-brand-ink" : "text-brand-muted")
      }
    >
      {icon}
    </button>
  );
}
