import { VENUE_LIST, type Cuisine, type Venue } from "../../data/venues";
import type { Order, OrderStatus, StatusUpdate } from "../../lib/orders";

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

export type NotificationEntry = {
  venueSlug: string;
  venueName: string;
  orderShortId: string;
  text: string;
  at: number;
  status: OrderStatus;
  fromVendor: boolean;
};

const NOTIF_HORIZON_MS = 7 * 86400000;
const NOTIF_LIMIT = 12;

function loadOrdersForSlug(slug: string): Order[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`tapow.${slug}.orders.v1`);
    if (!raw) return [];
    const data = JSON.parse(raw) as { orders?: Order[] };
    return data.orders ?? [];
  } catch {
    return [];
  }
}

export function buildNotifications(): NotificationEntry[] {
  const cutoff = Date.now() - NOTIF_HORIZON_MS;
  const entries: NotificationEntry[] = [];
  for (const venue of VENUE_LIST) {
    const orders = loadOrdersForSlug(venue.slug);
    for (const order of orders) {
      const updates = order.statusUpdates ?? [];
      const last: StatusUpdate | undefined = updates[updates.length - 1];
      if (!last) continue;
      if (last.at < cutoff) continue;
      entries.push({
        venueSlug: venue.slug,
        venueName: venue.name,
        orderShortId: order.shortId,
        text: last.text,
        at: last.at,
        status: order.status,
        fromVendor: last.fromVendor === true,
      });
    }
  }
  entries.sort((a, b) => b.at - a.at);
  return entries.slice(0, NOTIF_LIMIT);
}

/* ------------------------------------------------------------------ */
/*                Discovery prefs — favourites + hidden               */
/* ------------------------------------------------------------------ */
/* Per-customer preference state stored in localStorage. Cross-venue;
   the user's heart on a venue / hiding a venue is a global act, not
   tied to any single venue's order history. */

const FAV_KEY = "tapow.discovery.favourites.v1";
const HIDE_KEY = "tapow.discovery.hidden.v1";
const HIDE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function readFavourites(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function writeFavourites(favs: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
}

/** Map of slug → timestamp when hidden. Expired entries auto-pruned on read. */
export function readHidden(): Record<string, number> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(HIDE_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const now = Date.now();
    let changed = false;
    for (const slug of Object.keys(obj)) {
      if (now - obj[slug] > HIDE_DURATION_MS) {
        delete obj[slug];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(HIDE_KEY, JSON.stringify(obj));
    return obj;
  } catch {
    return {};
  }
}

export function writeHidden(hidden: Record<string, number>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(HIDE_KEY, JSON.stringify(hidden));
}
