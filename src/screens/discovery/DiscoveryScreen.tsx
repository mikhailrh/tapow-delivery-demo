import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  VENUE_LIST,
  type Cuisine,
  type Venue,
} from "../../data/venues";
import { formatRM } from "../../lib/money";
import {
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
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
  buildOrderAgainList,
  relativeTimeFrom,
  type OrderAgainEntry,
} from "./shared";

type HeroCategory = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  bg: string;
};

const HERO_CATEGORIES: HeroCategory[] = [
  {
    id: "near-me",
    title: "Near Me",
    subtitle: "Get it quick",
    emoji: "📍",
    bg: "bg-emerald-50",
  },
  {
    id: "top-rated",
    title: "Top Rated",
    subtitle: "Best of Tapow",
    emoji: "⭐",
    bg: "bg-amber-50",
  },
  {
    id: "free-delivery",
    title: "Free Delivery",
    subtitle: "Today only",
    emoji: "🛵",
    bg: "bg-rose-50",
  },
  {
    id: "new-arrivals",
    title: "New on Tapow",
    subtitle: "Try something new",
    emoji: "✨",
    bg: "bg-violet-50",
  },
];

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

export default function DiscoveryScreen() {
  const [cuisineFilter, setCuisineFilter] = useState<Cuisine | null>(null);
  const [under30, setUnder30] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const orderAgain = useMemo(() => buildOrderAgainList(), []);

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
    if (under30) list = list.filter((v) => v.estimatedDeliveryMinutes[1] <= 30);
    if (offersOnly) list = list.filter((v) => v.hasOffer);
    list.sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return b.rating - a.rating;
    });
    return list;
  }, [cuisineFilter, under30, offersOnly]);

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="sticky top-0 z-20 bg-white">
        <LocationBar />
        <DeliveryPickupTabs />
        <FilterChipsRow
          under30={under30}
          setUnder30={setUnder30}
          offersOnly={offersOnly}
          setOffersOnly={setOffersOnly}
        />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32">
        <CuisineTileRow
          selected={cuisineFilter}
          onSelect={(c) =>
            setCuisineFilter((prev) => (prev === c ? null : c))
          }
        />
        <HeroCategoryRow />
        {orderAgain.length > 0 && (
          <OrderAgainRail entries={orderAgain} onPick={goToVenue} />
        )}
        <RestaurantList
          venues={filteredVenues}
          totalCount={VENUE_LIST.length}
          activeFilter={cuisineFilter}
          clearFilter={() => setCuisineFilter(null)}
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                            Top bar                                 */
/* ------------------------------------------------------------------ */

function LocationBar() {
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
        aria-label="Notifications"
        className="w-10 h-10 rounded-full bg-brand-canvas flex items-center justify-center"
      >
        <BellIcon className="w-5 h-5 text-brand-ink" />
      </button>
    </div>
  );
}

function DeliveryPickupTabs() {
  return (
    <div className="px-4 pb-3 flex items-center gap-2">
      <button className="px-4 py-2 rounded-full bg-brand-ink text-white text-[13.5px] font-bold flex items-center gap-1.5">
        <span aria-hidden>🛵</span>
        Delivery
      </button>
      <button
        className="px-4 py-2 rounded-full bg-brand-canvas text-brand-ink text-[13.5px] font-semibold opacity-60"
        aria-disabled
      >
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
}: {
  under30: boolean;
  setUnder30: (v: boolean) => void;
  offersOnly: boolean;
  setOffersOnly: (v: boolean) => void;
}) {
  return (
    <div className="px-4 pb-3 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-2 w-max">
        <Chip>
          <SortIcon className="w-3.5 h-3.5" />
          Sort by
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

function HeroCategoryRow() {
  return (
    <div className="pt-2 pb-4 overflow-x-auto scrollbar-none">
      <div className="flex items-stretch gap-3 px-4 w-max">
        {HERO_CATEGORIES.map((c) => (
          <div
            key={c.id}
            className={
              "w-[150px] rounded-2xl px-4 py-4 flex flex-col gap-1 flex-shrink-0 " +
              c.bg
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
          </div>
        ))}
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
  clearFilter,
  onPick,
}: {
  venues: Venue[];
  totalCount: number;
  activeFilter: Cuisine | null;
  clearFilter: () => void;
  onPick: (slug: string) => void;
}) {
  return (
    <div className="pt-1 pb-2">
      <div className="px-4 flex items-end justify-between mb-3">
        <h2 className="text-[18px] font-extrabold text-brand-ink">
          {activeFilter ? `${activeFilter} restaurants` : "All restaurants"}
        </h2>
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
            <RestaurantCard key={v.slug} venue={v} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  );
}

function RestaurantCard({
  venue,
  onPick,
}: {
  venue: Venue;
  onPick: (slug: string) => void;
}) {
  const [eMin, eMax] = venue.estimatedDeliveryMinutes;
  const eta = eMin === eMax ? `${eMin} min` : `${eMin}–${eMax} min`;
  const fee =
    venue.deliveryFee === 0 ? "Free delivery" : `${formatRM(venue.deliveryFee)} delivery`;

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
          <div className="text-[12px] text-brand-muted mt-1">
            {eta} · {fee}
          </div>
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

