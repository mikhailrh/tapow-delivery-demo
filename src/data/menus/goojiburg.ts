import type { MenuCategory, OptionalAddon } from "../menu";

/**
 * Goojiburg (Dewan Damai, Kota Kinabalu).
 * Source: foodpanda listing captured 8 May 2026.
 *
 * Foodpanda lists three modifier groups: Beef Add Ons (max 6), Chicken Add Ons
 * (max 2), Make It A Combo (max 1). The current MenuItem schema has a single
 * flat `addons: OptionalAddon[]` checkbox list with no grouping or per-group
 * max — so we flatten add-ons + combo options together per item. Customers
 * can technically tick multiple combos (no enforced "select up to 1") until
 * the modifier-group schema lands.
 */

const BEEF_ADDONS: OptionalAddon[] = [
  { id: "gj-add-beef-smash", label: "Smashed patty", price: 9 },
  { id: "gj-add-beef-cheese", label: "Cheese", price: 2 },
  { id: "gj-add-beef-sunny", label: "Sunny side up", price: 3 },
  { id: "gj-add-beef-mango", label: "Mango chutney", price: 3.5 },
  { id: "gj-add-beef-160g", label: "160g Hamburger patty", price: 18 },
  { id: "gj-add-beef-truffle", label: "Truffle aioli", price: 6 },
];

const CHICKEN_ADDONS: OptionalAddon[] = [
  { id: "gj-add-chk-thigh", label: "Fried chicken thigh", price: 12 },
  { id: "gj-add-chk-cheese", label: "Cheese", price: 2 },
  { id: "gj-add-chk-sunny", label: "Sunny side up", price: 3 },
  { id: "gj-add-chk-mango", label: "Mango chutney", price: 3.5 },
  { id: "gj-add-chk-truffle", label: "Truffle aioli", price: 6 },
];

const COMBO_ADDONS: OptionalAddon[] = [
  { id: "gj-combo-coke", label: "Combo · Coke Asli + Fries", price: 10 },
  { id: "gj-combo-water", label: "Combo · Mineral Water + Fries", price: 10 },
  { id: "gj-combo-sparkling", label: "Combo · Sparkling Water + Fries", price: 10 },
];

const SMASH_HERO =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&q=80&auto=format&fit=crop";
const CHICKEN_HERO =
  "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=1000&q=80&auto=format&fit=crop";

export const GOOJIBURG_MENU: MenuCategory[] = [
  {
    id: "beef-burgers",
    name: "Beef Burgers",
    items: [
      {
        id: "gj-beef-single",
        name: "Single Goo Smashburger",
        description:
          "Smashed Australian 100% beef patty, cheddar, Gooji Sauce, pickled radish, lettuce.",
        price: 21,
        badge: "Popular",
        image: SMASH_HERO,
        addons: [...BEEF_ADDONS, ...COMBO_ADDONS],
      },
      {
        id: "gj-beef-double",
        name: "Double GOOGOO Smashburger",
        description:
          "Two smashed Australian 100% beef patties, cheddar, Gooji Sauce, pickled radish, lettuce.",
        price: 32,
        badge: "Popular",
        image: SMASH_HERO,
        addons: [...BEEF_ADDONS, ...COMBO_ADDONS],
      },
      {
        id: "gj-beef-oongbak",
        name: "Oong Bak (Krapow Smashburger)",
        description:
          "Smashed Australian 100% beef patty, Thai basil kra pow, sabasco mayo, fried egg.",
        price: 34,
        addons: [...BEEF_ADDONS, ...COMBO_ADDONS],
      },
      {
        id: "gj-beef-macam-atas",
        name: "Macam Atas (Truffle Mushroom)",
        description:
          "160g Australian 100% beef patty, truffle mayo, cheddar, sautéed mushrooms.",
        price: 39,
        addons: [...BEEF_ADDONS, ...COMBO_ADDONS],
      },
      {
        id: "gj-beef-spillburg",
        name: "Steven Spillburg",
        description:
          "160g Australian 100% beef patty, beef-fat aioli, sharp cheddar, sliced tomato, butter lettuce. Hamburg-style.",
        price: 32,
        badge: "Popular",
        image: SMASH_HERO,
        addons: [...BEEF_ADDONS, ...COMBO_ADDONS],
      },
    ],
  },
  {
    id: "chicken-burgers",
    name: "Chicken Burgers",
    items: [
      {
        id: "gj-chk-smoke",
        name: "SMOKE.Ai.YAM",
        description:
          "Buttermilk fried chicken, House Ranch, hickory miso glaze, tomato, lettuce.",
        price: 25,
        badge: "Popular",
        image: CHICKEN_HERO,
        addons: [...CHICKEN_ADDONS, ...COMBO_ADDONS],
      },
      {
        id: "gj-chk-will",
        name: "WILL.Ai.YAM",
        description:
          "Buttermilk fried chicken, sabasco mayo, hot honey, tzatziki, pickles, lettuce.",
        price: 24,
        addons: [...CHICKEN_ADDONS, ...COMBO_ADDONS],
      },
    ],
  },
  {
    id: "beverages",
    name: "Beverages",
    items: [
      {
        id: "gj-bev-coke",
        name: "Coke Asli",
        description: "Canned drink.",
        price: 5,
      },
      {
        id: "gj-bev-water",
        name: "Spritzer Mineral Water",
        description: "Bottled mineral water.",
        price: 5,
      },
      {
        id: "gj-bev-sparkling",
        name: "Spritzer Sparkling Water",
        description: "Bottled sparkling water.",
        price: 5,
      },
    ],
  },
];
