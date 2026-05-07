import { useEffect, useMemo, useRef, useState } from "react";
import { VENUE_LIST, type Venue } from "../../data/venues";
import {
  BackIcon,
  CloseIcon,
  SearchIcon,
  StarIcon,
} from "../../components/icons";

type DishHit = {
  kind: "dish";
  itemId: string;
  itemName: string;
  category: string;
  venue: Venue;
};

type VenueHit = {
  kind: "venue";
  venue: Venue;
};

type Hit = VenueHit | DishHit;

const RECENT_SEARCHES = ["Fried chicken", "Pasta", "Sushi", "Coffee"];

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out: Hit[] = [];
    for (const v of VENUE_LIST) {
      if (
        v.name.toLowerCase().includes(needle) ||
        v.cuisine.toLowerCase().includes(needle) ||
        (v.tagline ?? "").toLowerCase().includes(needle)
      ) {
        out.push({ kind: "venue", venue: v });
      }
      for (const cat of v.menu) {
        for (const item of cat.items) {
          if (item.name.toLowerCase().includes(needle)) {
            out.push({
              kind: "dish",
              itemId: item.id,
              itemName: item.name,
              category: cat.name,
              venue: v,
            });
          }
        }
      }
    }
    return out.slice(0, 30);
  }, [q]);

  const venueHits = hits.filter((h): h is VenueHit => h.kind === "venue");
  const dishHits = hits.filter((h): h is DishHit => h.kind === "dish");

  const goVenue = (slug: string) => {
    if (typeof window === "undefined") return;
    window.location.assign(`/v/${slug}`);
  };

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col">
      <div className="px-3 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2">
        <button
          onClick={onClose}
          aria-label="Close search"
          className="p-1.5 -ml-1.5"
        >
          <BackIcon className="w-6 h-6 text-brand-ink" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-brand-canvas rounded-full px-3.5 py-2.5">
          <SearchIcon className="w-5 h-5 text-brand-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search restaurants and dishes"
            className="flex-1 bg-transparent outline-none text-[14px] text-brand-ink placeholder:text-brand-muted"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear"
              className="p-0.5"
            >
              <CloseIcon className="w-4 h-4 text-brand-muted" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {q.trim().length === 0 ? (
          <Empty />
        ) : hits.length === 0 ? (
          <NoResults q={q} />
        ) : (
          <div className="pb-6">
            {venueHits.length > 0 && (
              <Section label="Restaurants">
                {venueHits.map((h) => (
                  <VenueRow
                    key={h.venue.slug}
                    venue={h.venue}
                    onClick={() => goVenue(h.venue.slug)}
                  />
                ))}
              </Section>
            )}
            {dishHits.length > 0 && (
              <Section label="Dishes">
                {dishHits.map((h) => (
                  <DishRow
                    key={h.venue.slug + ":" + h.itemId}
                    hit={h}
                    onClick={() => goVenue(h.venue.slug)}
                  />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="px-4 pt-5">
      <div className="text-[12px] font-bold text-brand-muted uppercase tracking-wide mb-2">
        Popular searches
      </div>
      <div className="flex flex-wrap gap-2">
        {RECENT_SEARCHES.map((r) => (
          <span
            key={r}
            className="px-3.5 py-1.5 rounded-full bg-brand-canvas text-[13px] text-brand-ink font-medium"
          >
            {r}
          </span>
        ))}
      </div>
      <div className="mt-8 text-center text-[13px] text-brand-muted">
        Start typing to search across {VENUE_LIST.length} restaurants.
      </div>
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="px-4 pt-12 text-center">
      <div className="text-[14px] text-brand-ink font-semibold">
        No matches for &quot;{q}&quot;
      </div>
      <div className="text-[12.5px] text-brand-muted mt-1">
        Try a different keyword, or browse cuisines on the homepage.
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-4">
      <div className="px-4 text-[11.5px] font-bold text-brand-muted uppercase tracking-wide mb-2">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function VenueRow({
  venue,
  onClick,
}: {
  venue: Venue;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-brand-canvas"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-brand-canvas flex-shrink-0">
        <img
          src={venue.heroImage}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-bold text-brand-ink truncate">
          {venue.name}
        </div>
        <div className="text-[12px] text-brand-muted flex items-center gap-1.5">
          <StarIcon className="text-amber-500 w-3 h-3" />
          <span className="font-semibold text-brand-ink">
            {venue.rating.toFixed(1)}
          </span>
          <span>·</span>
          <span>{venue.cuisine}</span>
        </div>
      </div>
    </button>
  );
}

function DishRow({
  hit,
  onClick,
}: {
  hit: DishHit;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-brand-canvas"
    >
      <div className="w-12 h-12 rounded-lg bg-brand-canvas flex-shrink-0 flex items-center justify-center">
        <SearchIcon className="w-5 h-5 text-brand-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-bold text-brand-ink truncate">
          {hit.itemName}
        </div>
        <div className="text-[12px] text-brand-muted truncate">
          {hit.category} · {hit.venue.name}
        </div>
      </div>
    </button>
  );
}
