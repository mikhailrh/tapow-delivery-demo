/**
 * Menu schema. Per-venue menu data lives in src/data/menus/<slug>.ts and is
 * wired onto each venue's `menu` field in src/data/venues/index.ts. Customer
 * flow reads from `venue.menu` via useVenue(), never from a static import.
 *
 * Modifier model:
 *
 * MenuItem.modifierGroups holds zero or more ModifierGroups. Each group is
 * either single-select (radio, default) or multi-select (multi: true,
 * checkbox; max caps the number that can be ticked). Groups can be required.
 *
 * For per-piece pricing (FowlBoys' XX Hot adds RM 2.50 *per piece*):
 * - The size group is marked kind: "size" and its options carry `pieces`.
 * - Other groups' options can flag `perPiece: true` to multiply their
 *   `priceDelta` by the active size's pieces.
 *
 * If an item has no modifierGroups, it's a price-only item (Kohinoor pattern).
 */

export type ModifierOption = {
  id: string;
  label: string;
  /** Added to the item base when this option is selected. Defaults to 0. */
  priceDelta?: number;
  /** Multiply priceDelta by `pieces` from the item's size-kind group. */
  perPiece?: boolean;
  /** Used by size-kind groups to expose a piece count to perPiece options. */
  pieces?: number;
};

export type ModifierGroup = {
  id: string;
  label: string;
  /** Customer must pick at least one option to add the item to cart. */
  required: boolean;
  /** True = checkbox (zero or more); absent/false = radio (exactly one). */
  multi?: boolean;
  /** Upper bound for multi-select groups. Ignored for single-select. */
  max?: number;
  /**
   * "size" groups participate in per-piece pricing for sibling groups.
   * The selected option's `pieces` value gets multiplied with each
   * `perPiece: true` priceDelta on the same item.
   */
  kind?: "size";
  options: ModifierOption[];
};

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  /** Base price before any modifiers. */
  price: number;
  /** Small badge shown next to item name (e.g. "Signature", "Popular"). */
  badge?: string;
  /** Absolute public path or URL. Used as item hero on ItemScreen. */
  image?: string;
  /** Optional modifier groups. Each group is required-or-not, single-or-multi. */
  modifierGroups?: ModifierGroup[];
  /** Item contains alcohol — surfaced on menus that mark it (e.g. Bar Abong's ▲). */
  containsAlcohol?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
  /** Optional category-wide footer note (e.g. drinks-list housekeeping). */
  note?: string;
};
