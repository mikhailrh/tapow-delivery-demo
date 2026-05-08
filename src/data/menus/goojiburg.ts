import type { MenuCategory, ModifierGroup } from "../menu";

/**
 * Goojiburg (Dewan Damai, Kota Kinabalu).
 * Source: foodpanda listing captured 8 May 2026.
 *
 * The new modifier-group schema enforces foodpanda's per-group max:
 * - Beef Add Ons: multi, max 6 (more is moot — there are only 6 options)
 * - Chicken Add On: multi, max 2
 * - Make It A Combo: multi, max 1 — customer can pick 0 or 1 combo
 */

const BEEF_ADDON_GROUP: ModifierGroup = {
  id: "beef-addons",
  label: "Beef burger add-ons",
  required: false,
  multi: true,
  max: 6,
  options: [
    { id: "gj-beef-smash", label: "Smashed patty", priceDelta: 9 },
    { id: "gj-beef-cheese", label: "Cheese", priceDelta: 2 },
    { id: "gj-beef-sunny", label: "Sunny side up", priceDelta: 3 },
    { id: "gj-beef-mango", label: "Mango chutney", priceDelta: 3.5 },
    { id: "gj-beef-160g", label: "160g Hamburger patty", priceDelta: 18 },
    { id: "gj-beef-truffle", label: "Truffle aioli", priceDelta: 6 },
  ],
};

const CHICKEN_ADDON_GROUP: ModifierGroup = {
  id: "chicken-addons",
  label: "Chicken burger add-ons",
  required: false,
  multi: true,
  max: 2,
  options: [
    { id: "gj-chk-thigh", label: "Fried chicken thigh", priceDelta: 12 },
    { id: "gj-chk-cheese", label: "Cheese", priceDelta: 2 },
    { id: "gj-chk-sunny", label: "Sunny side up", priceDelta: 3 },
    { id: "gj-chk-mango", label: "Mango chutney", priceDelta: 3.5 },
    { id: "gj-chk-truffle", label: "Truffle aioli", priceDelta: 6 },
  ],
};

const COMBO_GROUP: ModifierGroup = {
  id: "combo",
  label: "Make it a combo!",
  required: false,
  multi: true,
  max: 1,
  options: [
    { id: "gj-combo-coke", label: "Coke Asli + Fries", priceDelta: 10 },
    { id: "gj-combo-water", label: "Mineral Water + Fries", priceDelta: 10 },
    { id: "gj-combo-sparkling", label: "Sparkling Water + Fries", priceDelta: 10 },
  ],
};

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
        modifierGroups: [BEEF_ADDON_GROUP, COMBO_GROUP],
      },
      {
        id: "gj-beef-double",
        name: "Double GOOGOO Smashburger",
        description:
          "Two smashed Australian 100% beef patties, cheddar, Gooji Sauce, pickled radish, lettuce.",
        price: 32,
        badge: "Popular",
        image: SMASH_HERO,
        modifierGroups: [BEEF_ADDON_GROUP, COMBO_GROUP],
      },
      {
        id: "gj-beef-oongbak",
        name: "Oong Bak (Krapow Smashburger)",
        description:
          "Smashed Australian 100% beef patty, Thai basil kra pow, sabasco mayo, fried egg.",
        price: 34,
        modifierGroups: [BEEF_ADDON_GROUP, COMBO_GROUP],
      },
      {
        id: "gj-beef-macam-atas",
        name: "Macam Atas (Truffle Mushroom)",
        description:
          "160g Australian 100% beef patty, truffle mayo, cheddar, sautéed mushrooms.",
        price: 39,
        modifierGroups: [BEEF_ADDON_GROUP, COMBO_GROUP],
      },
      {
        id: "gj-beef-spillburg",
        name: "Steven Spillburg",
        description:
          "160g Australian 100% beef patty, beef-fat aioli, sharp cheddar, sliced tomato, butter lettuce. Hamburg-style.",
        price: 32,
        badge: "Popular",
        image: SMASH_HERO,
        modifierGroups: [BEEF_ADDON_GROUP, COMBO_GROUP],
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
        modifierGroups: [CHICKEN_ADDON_GROUP, COMBO_GROUP],
      },
      {
        id: "gj-chk-will",
        name: "WILL.Ai.YAM",
        description:
          "Buttermilk fried chicken, sabasco mayo, hot honey, tzatziki, pickles, lettuce.",
        price: 24,
        modifierGroups: [CHICKEN_ADDON_GROUP, COMBO_GROUP],
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
