import { useSyncExternalStore } from "react";
import type { Order } from "./orders";
import { scopedKey } from "./sync";

/**
 * Per-tab record of when the vendor last read each order's chat thread.
 *
 * Kept OUTSIDE `Order` (and therefore outside the cross-tab BroadcastChannel
 * sync) on purpose: read-state is a UI concern local to whoever's looking at
 * the kitchen tablet — syncing it would mean a manager peeking at their phone
 * silently clears the badge on the vendor's tablet. Persisted to localStorage
 * so the same tab restores its read-state after reload.
 */
const STORAGE_SUFFIX = "vendor.lastReadAt.v1";

type LastReadMap = Record<string, number>;

let state: LastReadMap = readFromStorage();
const listeners = new Set<() => void>();

function readFromStorage(): LastReadMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_SUFFIX));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as LastReadMap) : {};
  } catch {
    return {};
  }
}

function writeToStorage(next: LastReadMap) {
  try {
    localStorage.setItem(scopedKey(STORAGE_SUFFIX), JSON.stringify(next));
  } catch {
    /* quota / SSR — best effort */
  }
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

export function markChatRead(orderId: string, at: number = Date.now()) {
  if (state[orderId] === at) return;
  state = { ...state, [orderId]: at };
  writeToStorage(state);
  emit();
}

export function getLastReadAt(orderId: string): number {
  return state[orderId] ?? 0;
}

/**
 * Live unread count for the given order — re-renders the calling component
 * when either the order's messages change (via its `order` prop) or the
 * lastReadAt map updates.
 */
export function useChatUnreadCount(order: Order): number {
  const lastRead = useSyncExternalStore(
    subscribe,
    () => state[order.id] ?? 0,
    () => state[order.id] ?? 0,
  );
  return (order.messages ?? []).reduce(
    (n, m) => n + (m.from === "customer" && m.at > lastRead ? 1 : 0),
    0,
  );
}
