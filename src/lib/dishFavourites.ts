/**
 * Per-dish favourites — customer marks individual menu items they reach for
 * repeatedly. Stored as a global Set<itemId> in localStorage; item IDs are
 * already venue-prefixed (ba-fish-sandwich, gj-beef-single, …) so a single
 * global set naturally scopes by venue without collisions.
 *
 * Parallel to the discovery venue-favourites system in
 * src/screens/discovery/shared.ts but separated because the use cases and
 * surfaces are independent — saving a venue is a different act from saving
 * a dish, and they live on different screens.
 */

const KEY = "tapow.dish-favourites.v1";

export function readDishFavourites(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function writeDishFavourites(favs: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify([...favs]));
}

export function isDishFavourite(itemId: string): boolean {
  return readDishFavourites().has(itemId);
}

export function toggleDishFavourite(itemId: string): Set<string> {
  const favs = readDishFavourites();
  if (favs.has(itemId)) favs.delete(itemId);
  else favs.add(itemId);
  writeDishFavourites(favs);
  return favs;
}
