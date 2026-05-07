/**
 * Cross-tab state sync via BroadcastChannel + localStorage, scoped per venue.
 *
 * Pattern: localStorage is the canonical store; BroadcastChannel notifies other
 * tabs (of the same venue) to re-read after a write. Same-context messages are
 * not echoed back, so the writing tab doesn't reload from disk.
 *
 * Keys passed in are short suffixes (e.g. "orders.v1") and are auto-prefixed
 * with `tapow.<slug>.` so two venues running in different tabs don't trample
 * each other. VenueProvider calls setActiveVenueSlug(...) synchronously during
 * its render before any descendants subscribe.
 */

import { DEFAULT_VENUE_SLUG } from "../data/venues";

type Listener = () => void;

let activeSlug = DEFAULT_VENUE_SLUG;
let channel: BroadcastChannel | null = null;
const listeners: Map<string, Set<Listener>> = new Map();

function attachChannelListener() {
  if (!channel) return;
  channel.addEventListener("message", (e: MessageEvent) => {
    const key = (e.data && (e.data as { key?: unknown }).key) as
      | string
      | undefined;
    if (typeof key !== "string") return;
    listeners.get(key)?.forEach((l) => l());
  });
}

function rebuildChannel() {
  if (typeof BroadcastChannel === "undefined") {
    channel = null;
    return;
  }
  if (channel) channel.close();
  channel = new BroadcastChannel(`tapow-${activeSlug}-sync`);
  attachChannelListener();
}

if (typeof BroadcastChannel !== "undefined") {
  rebuildChannel();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    listeners.get(e.key)?.forEach((l) => l());
  });
}

export function setActiveVenueSlug(slug: string) {
  if (slug === activeSlug && channel) return;
  activeSlug = slug;
  rebuildChannel();
}

export function scopedKey(suffix: string): string {
  return `tapow.${activeSlug}.${suffix}`;
}

export function subscribeToKey(suffix: string, listener: Listener): () => void {
  const key = scopedKey(suffix);
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);
  return () => {
    listeners.get(key)?.delete(listener);
  };
}

export function loadJSON<T>(suffix: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  const raw = localStorage.getItem(scopedKey(suffix));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(suffix: string, value: unknown) {
  const key = scopedKey(suffix);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    channel?.postMessage({ key });
  } catch {
    /* ignore quota / SSR */
  }
}
