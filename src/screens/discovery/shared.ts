import { VENUE_LIST, type Cuisine, type Venue } from "../../data/venues";
import type { Order } from "../../lib/orders";

export type CuisineTile = {
  cuisine: Cuisine;
  emoji: string;
  label: string;
};

export const CUISINE_TILES: CuisineTile[] = [
  { cuisine: "Western", emoji: "🥩", label: "Western" },
  { cuisine: "Seafood", emoji: "🦐", label: "Seafood" },
  { cuisine: "Asian", emoji: "🍜", label: "Asian" },
  { cuisine: "Cafe", emoji: "☕", label: "Cafe" },
  { cuisine: "Italian", emoji: "🍝", label: "Italian" },
  { cuisine: "Bar", emoji: "🍹", label: "Bar" },
  { cuisine: "Chinese", emoji: "🥡", label: "Chinese" },
  { cuisine: "Indian", emoji: "🍛", label: "Indian" },
  { cuisine: "Malaysian", emoji: "🍲", label: "Malaysian" },
  { cuisine: "Japanese", emoji: "🍣", label: "Japanese" },
];

export type OrderAgainEntry = {
  venue: Venue;
  lastOrderedAt: number;
};

function loadCollectedOrdersForSlug(slug: string): Order[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`tapow.${slug}.orders.v1`);
    if (!raw) return [];
    const data = JSON.parse(raw) as { orders?: Order[] };
    return (data.orders ?? []).filter((o) => o.status === "collected");
  } catch {
    return [];
  }
}

export function buildOrderAgainList(): OrderAgainEntry[] {
  const entries: OrderAgainEntry[] = [];
  for (const venue of VENUE_LIST) {
    const collected = loadCollectedOrdersForSlug(venue.slug);
    if (collected.length === 0) continue;
    const lastOrderedAt = collected.reduce(
      (m, o) => Math.max(m, o.collectedAt ?? o.placedAt),
      0,
    );
    entries.push({ venue, lastOrderedAt });
  }
  entries.sort((a, b) => b.lastOrderedAt - a.lastOrderedAt);
  return entries;
}

export function relativeTimeFrom(ts: number): string {
  const ms = Date.now() - ts;
  const days = Math.floor(ms / 86400000);
  if (days >= 7) return `${Math.floor(days / 7)}w ago`;
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return `${hours}h ago`;
  const minutes = Math.max(1, Math.floor(ms / 60000));
  return `${minutes}m ago`;
}
