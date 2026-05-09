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
  FilterIcon,
  HomeIcon,
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
  relativeTimeFrom,
  type NotificationEntry,
  type OrderAgainEntry,
} from "./shared";

type HeroFilterId = "near-me" | "top-rated" | "free-delivery" | "new-arrivals";

type HeroCategory = {
  id: HeroFilterId;
  title: string;
  subtitle: string;
  emoji: string;
  bg: string;
  activeBg: string;
};

const HERO_CATEGORIES: HeroCategory[] = [
  {
    id: "near-me",
    title: "Near Me",
    subtitle: "Get it quick",
    emoji: "📍",
    bg: "bg-emerald-50",
    activeBg: "bg-emerald-100 ring-2 ring-emerald-500",
  },
  {
    id: "top-rated",
    title: "Top Rated",
    subtitle: "Best of Tapow",
    emoji: "⭐",
    bg: "bg-amber-50",
    activeBg: "bg-amber-100 ring-2 ring-amber-500",
  },
  {
    id: "free-delivery",
    title: "Free Delivery",
    subtitle: "Today only",
    emoji: "🛵",
    bg: "bg-rose-50",
    activeBg: "bg-rose-100 ring-2 ring-rose-500",
  },
  {
    id: "new-arrivals",
    title: "New on Tapow",
    subtitle: "Try something new",
    emoji: "✨",
    bg: "bg-violet-50",
    activeBg: "bg-violet-100 ring-2 ring-violet-500",
  },
];

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

function applyHeroFilter(list: Venue[], hero: HeroFilterId | null): Venue[] {
  if (!hero) return list;
  if (hero === "top-rated") return list.filter((v) => v.rating >= 4.7);
  if (hero === "free-delivery") {
    return list.filter(
      (v) =>
        v.deliveryFee === 0 ||
        (v.hasOffer?.label.toLowerCase().includes("free delivery") ?? false),
    );
  }
  if (hero === "new-arrivals") return list.filter((v) => v.ratingCount < 250);
  // "near-me" doesn't filter — it just biases sort toward speed.
  return list;
}

function sortVenues(
  list: Venue[],
  sortBy: SortKey,
  pickupMode: boolean,
  hero: HeroFilterId | null,
): Venue[] {
  const sorted = list.slice();
  const speedKey = (v: Venue) =>
    pickupMode ? v.kitchenPrepDefaultMinutes : v.estimatedDeliveryMinutes[0];
  // Always anchor closed venues to the bottom regardless of sort key.
  sorted.sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    if (hero === "near-me") return speedKey(a) - speedKey(b);
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
  const [heroFilter, setHeroFilter] = useState<HeroFilterId | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    let list = VENUE_LIST.slice();
    if (cuisineFilter) list = list.filter((v) => v.cuisine === cuisineFilter);
    if (under30) {
      list = list.filter((v) =>
        pickupMode
          ? v.kitchenPrepDefaultMinutes <= 30
          : v.estimatedDeliveryMinutes[1] <= 30,
      );
    }
    if (offersOnly) list = list.filter((v) => v.hasOffer);
    list = applyHeroFilter(list, heroFilter);
    return sortVenues(list, sortBy, pickupMode, heroFilter);
  }, [cuisineFilter, under30, offersOnly, pickupMode, heroFilter, sortBy]);

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="sticky top-0 z-20 bg-white">
        <LocationBar
          unreadCount={unreadCount}
          onBellTap={() => setNotifSheetOpen(true)}
        />
        <DeliveryPickupTabs
          pickupMode={pickupMode}
          onChange={setPickupMode}
        />
        <FilterChipsRow
          under30={under30}
          setUnder30={setUnder30}
          offersOnly={offersOnly}
          setOffersOnly={setOffersOnly}
          sortBy={sortBy}
          onSortTap={() => setSortSheetOpen(true)}
        />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32">
        <CuisineTileRow
          selected={cuisineFilter}
          onSelect={(c) =>
            setCuisineFilter((prev) => (prev === c ? null : c))
          }
        />
        <HeroCategoryRow
          active={heroFilter}
          onSelect={(id) =>
            setHeroFilter((prev) => (prev === id ? null : id))
          }
        />
        {orderAgain.length > 0 && (
          <OrderAgainRail entries={orderAgain} onPick={goToVenue} />
        )}
        <RestaurantList
          venues={filteredVenues}
          totalCount={VENUE_LIST.length}
          activeFilter={cuisineFilter}
          activeHero={heroFilter}
          pickupMode={pickupMode}
          clearFilter={() => {
            setCuisineFilter(null);
            setHeroFilter(null);
          }}
          onPick={goToVenue}
        />
      </div>

      <BottomBar onSearchTap={() => setSearchOpen(true)} />

      {searchOpen && (
        <SearchOverlay
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
}: {
  unreadCount: number;
  onBellTap: () => void;
}) {
  return (
    <div className="px-4 pt-4 pb-3 flex items-center justify-between">
      <button className="flex items-start gap-1.5 -ml-1 px-1 text-left">
        <PinIcon className="w-5 h-5 text-brand-green mt-0.5" />
        <div>
          <div className="text-[11px] text-brand-muted leading-tight">
            Deliver now
          </div>
          <div className="flex items-center gap-1 text-brand-ink">
            <span className="text-[15px] font-bold leading-tight">Home</span>
            <ChevronDownIcon className="w-4 h-4" />
          </div>
        </div>
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
  );
}

function DeliveryPickupTabs({
  pickupMode,
  onChange,
}: {
  pickupMode: boolean;
  onChange: (pickup: boolean) => void;
}) {
  return (
    <div className="px-4 pb-3 flex items-center gap-2">
      <button
        onClick={() => onChange(false)}
        className={
          "px-4 py-2 rounded-full text-[13.5px] font-bold flex items-center gap-1.5 transition-colors " +
          (!pickupMode
            ? "bg-brand-ink text-white"
            : "bg-brand-canvas text-brand-ink")
        }
      >
        <span aria-hidden>🛵</span>
        Delivery
      </button>
      <button
        onClick={() => onChange(true)}
        className={
          "px-4 py-2 rounded-full text-[13.5px] font-bold flex items-center gap-1.5 transition-colors " +
          (pickupMode
            ? "bg-brand-ink text-white"
            : "bg-brand-canvas text-brand-ink")
        }
      >
        <span aria-hidden>🛍️</span>
        Pickup
      </button>
    </div>
  );
}

function FilterChipsRow({
  under30,
  setUnder30,
  offersOnly,
  setOffersOnly,
  sortBy,
  onSortTap,
}: {
  under30: boolean;
  setUnder30: (v: boolean) => void;
  offersOnly: boolean;
  setOffersOnly: (v: boolean) => void;
  sortBy: SortKey;
  onSortTap: () => void;
}) {
  const sortActive = sortBy !== "recommended";
  return (
    <div className="px-4 pb-3 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-2 w-max">
        <Chip active={sortActive} onClick={onSortTap}>
          <SortIcon className="w-3.5 h-3.5" />
          {sortActive ? SORT_LABELS[sortBy] : "Sort by"}
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </Chip>
        <Chip active={under30} onClick={() => setUnder30(!under30)}>
          Under 30 min
        </Chip>
        <Chip>Under RM3.00</Chip>
        <Chip active={offersOnly} onClick={() => setOffersOnly(!offersOnly)}>
          <TagIcon className="w-3.5 h-3.5" />
          Offers
        </Chip>
        <Chip>
          <FilterIcon className="w-3.5 h-3.5" />
          Filters
        </Chip>
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
/*                       Hero category cards                          */
/* ------------------------------------------------------------------ */

function HeroCategoryRow({
  active,
  onSelect,
}: {
  active: HeroFilterId | null;
  onSelect: (id: HeroFilterId) => void;
}) {
  return (
    <div className="pt-2 pb-4 overflow-x-auto scrollbar-none">
      <div className="flex items-stretch gap-3 px-4 w-max">
        {HERO_CATEGORIES.map((c) => {
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={
                "w-[150px] rounded-2xl px-4 py-4 flex flex-col gap-1 flex-shrink-0 text-left transition-all " +
                (isActive ? c.activeBg : c.bg)
              }
            >
              <div className="text-[28px] leading-none mb-1" aria-hidden>
                {c.emoji}
              </div>
              <div className="text-[14px] font-bold text-brand-ink leading-tight">
                {c.title}
              </div>
              <div className="text-[11.5px] text-brand-muted leading-tight">
                {c.subtitle}
              </div>
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

function heroHeadline(hero: HeroFilterId): string {
  switch (hero) {
    case "near-me":
      return "Nearby restaurants";
    case "top-rated":
      return "Top rated";
    case "free-delivery":
      return "Free delivery";
    case "new-arrivals":
      return "New on Tapow";
  }
}

function RestaurantList({
  venues,
  totalCount,
  activeFilter,
  activeHero,
  pickupMode,
  clearFilter,
  onPick,
}: {
  venues: Venue[];
  totalCount: number;
  activeFilter: Cuisine | null;
  activeHero: HeroFilterId | null;
  pickupMode: boolean;
  clearFilter: () => void;
  onPick: (slug: string) => void;
}) {
  const heading = activeFilter
    ? `${activeFilter} restaurants`
    : activeHero
      ? heroHeadline(activeHero)
      : "All restaurants";
  return (
    <div className="pt-1 pb-2">
      <div className="px-4 flex items-end justify-between mb-3">
        <h2 className="text-[18px] font-extrabold text-brand-ink">{heading}</h2>
        <div className="text-[12px] text-brand-muted">
          {venues.length} of {totalCount}
        </div>
      </div>
      {venues.length === 0 ? (
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
      ) : (
        <div className="flex flex-col gap-4 px-4">
          {venues.map((v) => (
            <RestaurantCard
              key={v.slug}
              venue={v}
              pickupMode={pickupMode}
              onPick={onPick}
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
  onPick,
}: {
  venue: Venue;
  pickupMode: boolean;
  onPick: (slug: string) => void;
}) {
  const [eMin, eMax] = venue.estimatedDeliveryMinutes;
  const eta = eMin === eMax ? `${eMin} min` : `${eMin}–${eMax} min`;
  const fee =
    venue.deliveryFee === 0 ? "Free delivery" : `${formatRM(venue.deliveryFee)} delivery`;
  const metaLine = pickupMode
    ? `Ready in ${venue.kitchenPrepDefaultMinutes} min · Pickup`
    : `${eta} · ${fee}`;

  return (
    <button
      onClick={() => venue.isOpen && onPick(venue.slug)}
      disabled={!venue.isOpen}
      className="w-full text-left"
    >
      <div className="relative rounded-2xl overflow-hidden bg-brand-canvas aspect-[16/10] mb-2">
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
            className="absolute top-3 left-3 px-2 py-1 rounded text-[11px] font-bold text-white"
            style={{ background: venue.hasOffer.pillColor ?? "#DC2626" }}
          >
            {venue.hasOffer.label}
          </div>
        )}
        {!venue.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 px-4 py-2 rounded-full text-[12.5px] font-bold text-brand-ink">
              Currently closed
            </div>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[16px] font-extrabold text-brand-ink leading-tight truncate">
            {venue.name}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-brand-muted mt-1">
            <StarIcon className="text-amber-500" />
            <span className="font-semibold text-brand-ink">
              {venue.rating.toFixed(1)}
            </span>
            <span>({formatRatingCount(venue.ratingCount)})</span>
            <Dot />
            <span>{venue.cuisine}</span>
            <Dot />
            <span>{"$".repeat(venue.priceTier)}</span>
          </div>
          <div className="text-[12px] text-brand-muted mt-1">{metaLine}</div>
        </div>
      </div>
    </button>
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
