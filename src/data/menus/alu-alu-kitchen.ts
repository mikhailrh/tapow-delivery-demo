import type { MenuCategory, ModifierGroup, ModifierOption } from "../menu";

/**
 * Alu-Alu Kitchen (Kelombong, Kota Kinabalu).
 * Source: official Alu-Alu menu PDF, transcribed into reference/alu-alu-kitchen-menu.md.
 *
 * Modeling notes:
 * - Most savoury items use a Small/Medium size group (RM/RM pattern across the menu).
 * - Four matrix-priced sections (Noodles, Noodle Soup, Live Fish, Live Prawn) are
 *   modeled as one item per cooking-style with a required protein/fish modifier.
 *   Base price is the cheapest variant; deltas walk up to the most expensive.
 * - Per-kg / seasonal items keep a representative base price; their description
 *   notes that final price is confirmed by weight or market on the day. The
 *   demo's cart math still works — production would substitute a real
 *   weigh-in flow.
 * - Half-chicken items (OC07/OC08/OC10) sit flat without a size group, since
 *   the source has no Medium tier for them.
 * - Soft Shell Crabs share a base Small/Medium (RM 45/88), with per-item
 *   tweaks where the source called for an upcharge.
 */

/**
 * Only verified Unsplash IDs — same set as venue heroes. Per-category
 * imagery is approximate (many items share); production gets real photos.
 */
const IMG = {
  hero:
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1000&q=80&auto=format&fit=crop",
  fish:
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1000&q=80&auto=format&fit=crop",
  prawn:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&q=80&auto=format&fit=crop",
  crab:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&q=80&auto=format&fit=crop",
  noodle:
    "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1000&q=80&auto=format&fit=crop",
  rice:
    "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1000&q=80&auto=format&fit=crop",
  soup:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=80&auto=format&fit=crop",
  chicken:
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1000&q=80&auto=format&fit=crop",
  tofu:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=80&auto=format&fit=crop",
  veg:
    "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1000&q=80&auto=format&fit=crop",
  dessert:
    "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1000&q=80&auto=format&fit=crop",
};

/* --------------------------- Reusable groups ---------------------------- */

const smallMediumGroup = (
  smallDelta: number,
  mediumDelta: number,
): ModifierGroup => ({
  id: "size",
  label: "Pick a size",
  required: true,
  kind: "size",
  options: [
    { id: "small", label: "Small", priceDelta: smallDelta },
    { id: "medium", label: "Medium", priceDelta: mediumDelta },
  ],
});

/** Standard noodle protein matrix. Base price set to chicken (RM 14.80). */
const NOODLE_PROTEIN_OPTIONS: ModifierOption[] = [
  { id: "chicken", label: "Chicken", priceDelta: 0 },
  { id: "beef", label: "Beef", priceDelta: 0 },
  { id: "seabass", label: "Seabass", priceDelta: 0 },
  { id: "snapper", label: "Snapper", priceDelta: 2 },
  { id: "grouper", label: "Grouper", priceDelta: 4.2 },
  { id: "prawn", label: "Prawn", priceDelta: 4.2 },
  { id: "seafood", label: "Mixed seafood", priceDelta: 6.2 },
];

const noodleProteinGroup = (): ModifierGroup => ({
  id: "protein",
  label: "Pick a protein",
  required: true,
  options: NOODLE_PROTEIN_OPTIONS,
});

/** Noodle Soup splits Grouper into Fish Slice + Fish Head; same prices as the dry matrix otherwise. */
const NOODLE_SOUP_PROTEIN_OPTIONS: ModifierOption[] = [
  { id: "chicken", label: "Chicken", priceDelta: 0 },
  { id: "seabass", label: "Seabass", priceDelta: 0 },
  { id: "snapper", label: "Snapper", priceDelta: 2 },
  { id: "grouper-slice", label: "Grouper (fish slice)", priceDelta: 4.2 },
  { id: "grouper-head", label: "Grouper (fish head)", priceDelta: 4.2 },
  { id: "prawn", label: "Prawn", priceDelta: 4.2 },
  { id: "seafood", label: "Mixed seafood", priceDelta: 6.2 },
];

const noodleSoupProteinGroup = (): ModifierGroup => ({
  id: "protein",
  label: "Pick a protein",
  required: true,
  options: NOODLE_SOUP_PROTEIN_OPTIONS,
});

/** Live fish: 5 types. Base price set to Belais (4 pcs) at RM 38. */
const LIVE_FISH_OPTIONS: ModifierOption[] = [
  { id: "belais-4", label: "Belais (4 pcs)", priceDelta: 0 },
  { id: "belais-8", label: "Belais (8 pcs)", priceDelta: 30 },
  { id: "seabass", label: "Seabass (per kg)", priceDelta: 62 },
  { id: "hybrid-grouper", label: "Hybrid Grouper (per kg)", priceDelta: 102 },
  { id: "tiger-grouper", label: "Tiger Grouper (per kg)", priceDelta: 142 },
  { id: "coral-trout", label: "Coral Trout (per kg)", priceDelta: 262 },
];

const liveFishGroup = (): ModifierGroup => ({
  id: "fish",
  label: "Pick a fish",
  required: true,
  options: LIVE_FISH_OPTIONS,
});

/** Live prawn: 2 types, per-kg pricing. Base set to White (RM 120/kg). */
const LIVE_PRAWN_OPTIONS: ModifierOption[] = [
  { id: "white-prawn", label: "White Prawn (per kg)", priceDelta: 0 },
  { id: "tiger-prawn", label: "Tiger Prawn (per kg)", priceDelta: 10 },
];

const livePrawnGroup = (): ModifierGroup => ({
  id: "prawn-type",
  label: "Pick a prawn",
  required: true,
  options: LIVE_PRAWN_OPTIONS,
});

const PER_KG_NOTE =
  "Per-kg pricing — final price confirmed by the kitchen after weighing.";

const SEASONAL_NOTE =
  "Seasonal — currently available; market price confirmed at the venue.";

/* ------------------------------ Menu data ------------------------------ */

export const ALU_ALU_KITCHEN_MENU: MenuCategory[] = [
  {
    id: "featured",
    name: "Featured / Live Catch",
    items: [
      {
        id: "aa-feat-lobster",
        name: "Live Wild-Caught Lobster",
        description:
          "Wild-caught lobster prepared to your preference. Per-kg pricing — final price confirmed by the kitchen after weighing.",
        price: 680,
        badge: "Signature",
        image: IMG.hero,
        modifierGroups: [
          {
            id: "cooking-style",
            label: "Cooking style",
            required: true,
            options: [
              { id: "buttermilk", label: "Buttermilk Sauce" },
              {
                id: "yee-mee",
                label: "Braised Yee Mee with Superior Broth",
              },
              { id: "sashimi", label: "Sashimi on Ice" },
              { id: "mayo-salad", label: "Mayo Salad" },
              {
                id: "dried-shrimp",
                label: "Dried Shrimp & Spicy Dark Soy Glaze",
              },
              { id: "steam-garlic", label: "Steam Garlic" },
              { id: "baked-cheese", label: "Baked Garlic Cheese" },
            ],
          },
        ],
      },
      {
        id: "aa-feat-clams",
        name: "Live White Clams",
        description: "Sha Bai (沙白). " + SEASONAL_NOTE,
        price: 28,
        image: IMG.hero,
        modifierGroups: [
          {
            id: "cooking-style",
            label: "Cooking style",
            required: true,
            options: [
              { id: "steam", label: "Steam" },
              { id: "steam-garlic", label: "Steam Garlic" },
              { id: "soup", label: "Soup" },
              { id: "sambal", label: "Sambal Belacan" },
              { id: "kam-hiong", label: "Kam Hiong" },
            ],
          },
        ],
      },
      {
        id: "aa-feat-strombus",
        name: "Live Strombus Shells",
        description: "Dong Feng Luo (东风螺). " + SEASONAL_NOTE,
        price: 35,
        image: IMG.hero,
        modifierGroups: [
          {
            id: "cooking-style",
            label: "Cooking style",
            required: true,
            options: [
              { id: "steam", label: "Steam" },
              { id: "steam-garlic", label: "Steam Garlic" },
              { id: "sambal", label: "Sambal Belacan" },
              { id: "kam-hiong", label: "Kam Hiong" },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "soup-type",
    name: "Soup",
    items: [
      {
        id: "aa-tp01",
        name: "Signature Fish Head Soup",
        description: "招牌鱼头汤. House-made broth with fresh fish head.",
        price: 35,
        badge: "Signature",
        image: IMG.soup,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-tp02",
        name: "Sweet Corn Soup with Crab Meat",
        description: "蛐肉粟米羹.",
        price: 28,
        image: IMG.soup,
        modifierGroups: [smallMediumGroup(0, 22)],
      },
      {
        id: "aa-tp03",
        name: "Salted Vegetable Fish Head Soup",
        description: "咸菜鱼头汤.",
        price: 35,
        image: IMG.soup,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-tp04",
        name: "Fish Maw Seafood Soup",
        description: "海鲜鱼鳔羹.",
        price: 42,
        image: IMG.soup,
        modifierGroups: [smallMediumGroup(0, 33)],
      },
      {
        id: "aa-tp05",
        name: "Tom Yam Seafood",
        description: "冬阴功海鲜.",
        price: 42,
        image: IMG.soup,
        modifierGroups: [smallMediumGroup(0, 33)],
      },
      {
        id: "aa-tp06",
        name: "Chinese Herbal Soup with Tiger Prawns",
        description: "肉骨茶虾. Bak kut teh-style broth.",
        price: 45,
        badge: "Signature",
        image: IMG.soup,
        modifierGroups: [smallMediumGroup(0, 40)],
      },
    ],
  },

  {
    id: "rice",
    name: "Rice",
    items: [
      {
        id: "aa-r01",
        name: "Alu-Alu Signature Hainanese Chicken Rice",
        description: "海南鸡饭.",
        price: 22,
        badge: "Signature",
        image: IMG.rice,
      },
      {
        id: "aa-r02",
        name: "Fried Rice with Fish Fillet & Ginger",
        description: "蒙茉鱼片炒饭. Default fish; +RM 2 to upgrade to snapper.",
        price: 16.8,
        image: IMG.rice,
        modifierGroups: [
          {
            id: "fish-upgrade",
            label: "Upgrade fish",
            required: false,
            multi: true,
            max: 1,
            options: [
              { id: "snapper", label: "Snapper", priceDelta: 2 },
            ],
          },
        ],
      },
      {
        id: "aa-r03",
        name: "Lotus-Leaf Fried Rice with Chicken & Shrimp",
        description: "荷叶鸡虾炒饭. Wrapped and steamed in lotus leaf.",
        price: 21,
        image: IMG.rice,
      },
      {
        id: "aa-r04",
        name: "Thai Style Pineapple Fried Rice",
        description: "泰式黄梨炒饭.",
        price: 14.8,
        image: IMG.rice,
      },
      {
        id: "aa-r05",
        name: "Garlic Fried Rice",
        description: "金银蒜炒饭.",
        price: 14,
        image: IMG.rice,
      },
      {
        id: "aa-r06",
        name: "Salted Fish Fried Rice",
        description: "咸鱼炒饭.",
        price: 14.8,
        image: IMG.rice,
      },
      {
        id: "aa-r07",
        name: "Crab Meat Fried Rice",
        description: "蟹肉炒饭.",
        price: 33,
        image: IMG.rice,
      },
      {
        id: "aa-r08",
        name: "Teriyaki Chicken Drumstick with Rice",
        description: "日式照烧汁炸鸡腿饭.",
        price: 22,
        image: IMG.rice,
      },
    ],
  },

  {
    id: "noodles",
    name: "Noodles",
    items: [
      {
        id: "aa-n01",
        name: "Wa Tan Ho",
        description:
          "滑蛋河粉. Smooth-egg gravy over flat rice noodles. Pick your protein.",
        price: 14.8,
        badge: "Signature",
        image: IMG.noodle,
        modifierGroups: [noodleProteinGroup()],
      },
      {
        id: "aa-n02",
        name: "Fried Mee Hoon with Fish Sauce",
        description: "鱼露米粉. Pick your protein.",
        price: 14.8,
        image: IMG.noodle,
        modifierGroups: [noodleProteinGroup()],
      },
      {
        id: "aa-n03",
        name: "Fried Tuaran Mee",
        description: "干炒斗亚兰面. Sabah local-style noodles. Pick your protein.",
        price: 14.8,
        image: IMG.noodle,
        modifierGroups: [noodleProteinGroup()],
      },
      {
        id: "aa-n04",
        name: "Fried Mee or Mee Hoon",
        description: "炒粉面肉类. Choose your noodle and protein at the kitchen.",
        price: 14.8,
        image: IMG.noodle,
        modifierGroups: [noodleProteinGroup()],
      },
      {
        id: "aa-n05",
        name: "Hong Kong Style Beef Kuey Teow",
        description: "港式干炒牛河. Pick your protein (beef recommended).",
        price: 14.8,
        image: IMG.noodle,
        modifierGroups: [noodleProteinGroup()],
      },
      {
        id: "aa-n06",
        name: "Fried Mee Hoon with XO",
        description: "炒米粉XO. Premium XO sauce — adds RM 3 to the protein price.",
        price: 17.8,
        image: IMG.noodle,
        modifierGroups: [noodleProteinGroup()],
      },
    ],
  },

  {
    id: "noodle-soup",
    name: "Noodle Soup",
    items: [
      {
        id: "aa-ns01",
        name: "Salted Vegetable Soup Noodles",
        description: "咸菜汤. Pick your protein.",
        price: 14.8,
        badge: "Signature",
        image: IMG.soup,
        modifierGroups: [noodleSoupProteinGroup()],
      },
      {
        id: "aa-ns02",
        name: "Bitter Gourd Soup Noodles",
        description: "苦瓜汤. Pick your protein.",
        price: 14.8,
        image: IMG.soup,
        modifierGroups: [noodleSoupProteinGroup()],
      },
      {
        id: "aa-ns03",
        name: "Tom Yam Soup Noodles",
        description: "冬阴功汤. Pick your protein.",
        price: 14.8,
        image: IMG.soup,
        modifierGroups: [noodleSoupProteinGroup()],
      },
      {
        id: "aa-ns04",
        name: "Tomato Soup Noodles",
        description: "蕃茄汤. Pick your protein.",
        price: 14.8,
        image: IMG.soup,
        modifierGroups: [noodleSoupProteinGroup()],
      },
      {
        id: "aa-ns05",
        name: "Clear Soup Noodles",
        description: "清汤. Pick your protein.",
        price: 14.8,
        image: IMG.soup,
        modifierGroups: [noodleSoupProteinGroup()],
      },
    ],
  },

  {
    id: "fish-head-belly",
    name: "Fish Head & Fish Belly",
    items: [
      {
        id: "aa-f01",
        name: "Fish Head & Belly Curry",
        description: "咖喱鱼头腩.",
        price: 38,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f02",
        name: "Hong Saw Fish Head & Belly",
        description: "红烧鱼头腩.",
        price: 38,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f03",
        name: "Assam Fish Head & Belly",
        description: "亚三鱼头腩煲. Tangy tamarind claypot.",
        price: 38,
        badge: "Signature",
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f04",
        name: "Sang Mun Fish Head & Belly",
        description: "生闷鱼头腩.",
        price: 38,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f05",
        name: "Braised Fish Head & Belly with Enoki & Tofu",
        description: "沙煲炖鱼头腩豆付金针菇. Served in claypot.",
        price: 38,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f06",
        name: "Hakka Braised Fish Head & Belly",
        description: "客家闷鱼头腩.",
        price: 38,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f07",
        name: "Nyonya Style Fish Head & Belly",
        description: "娘惹鱼头腩.",
        price: 38,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f08",
        name: "Salt & Pepper Curry Fish Head & Belly",
        description: "椒盐咖喱鱼头腩.",
        price: 38,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f09",
        name: "Japanese Style Fish Belly",
        description: "日式鱼腩.",
        price: 38,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
      {
        id: "aa-f10",
        name: "Bei Fung Tong Fish Belly",
        description: "避風塘鱼腩. Typhoon-shelter style.",
        price: 38,
        badge: "Signature",
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 30)],
      },
    ],
  },

  {
    id: "live-fish",
    name: "Live Fish",
    items: [
      {
        id: "aa-st01",
        name: "Cantonese Steam Live Fish",
        description: "清蒸. " + PER_KG_NOTE,
        price: 38,
        badge: "Signature",
        image: IMG.fish,
        modifierGroups: [liveFishGroup()],
      },
      {
        id: "aa-st02",
        name: "Thai Sauce Live Fish",
        description: "泰式. " + PER_KG_NOTE,
        price: 38,
        image: IMG.fish,
        modifierGroups: [liveFishGroup()],
      },
      {
        id: "aa-st03",
        name: "Teo Chew Style Live Fish",
        description: "潮州. " + PER_KG_NOTE,
        price: 38,
        image: IMG.fish,
        modifierGroups: [liveFishGroup()],
      },
      {
        id: "aa-st04",
        name: "Ginger Sauce Live Fish",
        description: "姜蓉. " + PER_KG_NOTE,
        price: 38,
        image: IMG.fish,
        modifierGroups: [liveFishGroup()],
      },
      {
        id: "aa-st05",
        name: "Garlic Sauce Live Fish",
        description: "大蒜. " + PER_KG_NOTE,
        price: 38,
        image: IMG.fish,
        modifierGroups: [liveFishGroup()],
      },
      {
        id: "aa-st06",
        name: "Tiga Rasa Sauce Live Fish",
        description: "三味酱. Three-flavour sauce. " + PER_KG_NOTE,
        price: 38,
        image: IMG.fish,
        modifierGroups: [liveFishGroup()],
      },
    ],
  },

  {
    id: "organic-fish",
    name: "Organic Fish Slice",
    items: [
      {
        id: "aa-of01",
        name: "Buttermilk Fish Slice",
        description: "奶油班片.",
        price: 40,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 32)],
      },
      {
        id: "aa-of02",
        name: "Sweet & Sour Fish Slice",
        description: "甜酸班片.",
        price: 40,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 32)],
      },
      {
        id: "aa-of03",
        name: "Fish Slice with Wasabi Mayo & Shredded Potato",
        description: "芥末.",
        price: 40,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 32)],
      },
      {
        id: "aa-of04",
        name: "Ginger Onion Fish Slice",
        description: "姜蔥.",
        price: 48,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 40)],
      },
      {
        id: "aa-of05",
        name: "Kung Pao Fish Slice",
        description: "宫保.",
        price: 48,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 40)],
      },
      {
        id: "aa-of06",
        name: "Steamed Fish Slice with Preserved Radish",
        description: "菜莆蒸班片. Chye Poh-style steam.",
        price: 48,
        badge: "Signature",
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 40)],
      },
      {
        id: "aa-of07",
        name: "Thai Sauce Fish Slice",
        description: "泰式.",
        price: 40,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 32)],
      },
      {
        id: "aa-of08",
        name: "Salt & Pepper Fish Slice",
        description: "椒鹽.",
        price: 40,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 32)],
      },
      {
        id: "aa-of09",
        name: "Salted Egg Fish Slice",
        description: "咸蛋.",
        price: 42,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 33)],
      },
      {
        id: "aa-of10",
        name: "Steam Cantonese Style Fish Slice",
        description: "清蒸.",
        price: 48,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 40)],
      },
      {
        id: "aa-of11",
        name: "Steam Ginger Sauce Fish Slice",
        description: "姜蓉蒸.",
        price: 48,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 40)],
      },
      {
        id: "aa-of12",
        name: "Steam Garlic Sauce Fish Slice",
        description: "蒜蓉蒸.",
        price: 48,
        image: IMG.fish,
        modifierGroups: [smallMediumGroup(0, 40)],
      },
    ],
  },

  {
    id: "salted-fish",
    name: "Premium Live Salted Fish",
    items: [
      {
        id: "aa-sf01",
        name: "Premium Live Salted Fish",
        description: "咸鱼腩. Aged in-house, served by the slice.",
        price: 35,
        image: IMG.fish,
      },
    ],
  },

  {
    id: "organic-prawn",
    name: "Organic Prawn",
    items: [
      {
        id: "aa-op01",
        name: "Cereal Prawn",
        description: "麦香虾.",
        price: 40,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 35)],
      },
      {
        id: "aa-op02",
        name: "Salt & Pepper Prawn",
        description: "椒盐虾.",
        price: 40,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 35)],
      },
      {
        id: "aa-op03",
        name: "Salted Egg Yolk Prawn",
        description: "咸蛋虾.",
        price: 42,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 36)],
      },
      {
        id: "aa-op04",
        name: "Deep Fried Soy Sauce Prawn",
        description: "鼓油皇.",
        price: 40,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 35)],
      },
      {
        id: "aa-op05",
        name: "Dry Butter Prawn",
        description: "干奶油.",
        price: 40,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 35)],
      },
      {
        id: "aa-op06",
        name: "Crispy Battered Prawns with Teriyaki",
        description: "日式照烧汁配脆口虾球.",
        price: 40,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 35)],
      },
      {
        id: "aa-op07",
        name: "Steam Live Prawn",
        description: "白灼虾. " + PER_KG_NOTE,
        price: 120,
        badge: "Signature",
        image: IMG.prawn,
        modifierGroups: [livePrawnGroup()],
      },
      {
        id: "aa-op08",
        name: "Steam Egg White Live Prawn",
        description: "清蒸. " + PER_KG_NOTE,
        price: 120,
        image: IMG.prawn,
        modifierGroups: [livePrawnGroup()],
      },
      {
        id: "aa-op09",
        name: "Garlic Sauce Live Prawn",
        description: "蒜茸. " + PER_KG_NOTE,
        price: 120,
        image: IMG.prawn,
        modifierGroups: [livePrawnGroup()],
      },
    ],
  },

  {
    id: "soft-shell-crab",
    name: "Soft Shell Crab",
    items: [
      {
        id: "aa-cr01",
        name: "Claypot Glass Noodle Soft Shell Crab",
        description: "粉絲煲. Served in a claypot with vermicelli.",
        price: 45,
        badge: "Signature",
        image: IMG.crab,
        modifierGroups: [smallMediumGroup(0, 43)],
      },
      {
        id: "aa-cr02",
        name: "Salted Egg Yolk Soft Shell Crab",
        description: "咸蛋. Premium salted egg sauce (+RM 3).",
        price: 48,
        image: IMG.crab,
        modifierGroups: [smallMediumGroup(0, 43)],
      },
      {
        id: "aa-cr03",
        name: "Kam Hiong Soft Shell Crab",
        description: "甘香.",
        price: 45,
        image: IMG.crab,
        modifierGroups: [smallMediumGroup(0, 43)],
      },
      {
        id: "aa-cr04",
        name: "Salt & Pepper Soft Shell Crab",
        description: "椒盐.",
        price: 45,
        image: IMG.crab,
        modifierGroups: [smallMediumGroup(0, 43)],
      },
      {
        id: "aa-cr05",
        name: "Singapore Chilli Crab",
        description:
          "星洲酸辣. Served with mantou for dipping. Add 4 pcs of mantou below.",
        price: 45,
        image: IMG.crab,
        modifierGroups: [
          smallMediumGroup(0, 43),
          {
            id: "mantou",
            label: "Add mantou",
            required: false,
            multi: true,
            max: 1,
            options: [
              { id: "mantou-4", label: "4 pcs mantou", priceDelta: 5 },
            ],
          },
        ],
      },
      {
        id: "aa-cr06",
        name: "Bei Fung Tong Soft Shell Crab",
        description: "避风塘. Typhoon shelter style.",
        price: 45,
        image: IMG.crab,
        modifierGroups: [smallMediumGroup(0, 43)],
      },
      {
        id: "aa-cr07",
        name: "Teriyaki Soft Shell Crab",
        description: "优质照烧酱.",
        price: 45,
        badge: "Signature",
        image: IMG.crab,
        modifierGroups: [smallMediumGroup(0, 43)],
      },
    ],
  },

  {
    id: "organic-chicken",
    name: "Organic Chicken",
    items: [
      {
        id: "aa-oc01",
        name: "Chicken with Salted Fish in Claypot",
        description: "咸鱼鸡煲.",
        price: 35,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 27)],
      },
      {
        id: "aa-oc02",
        name: "Kung Pao Chicken",
        description: "宫保鸡.",
        price: 35,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 27)],
      },
      {
        id: "aa-oc03",
        name: "Mongolian Chicken",
        description: "蒙古鸡.",
        price: 35,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 27)],
      },
      {
        id: "aa-oc04",
        name: "Honey Glazed Chicken",
        description: "蜜汁鸡球.",
        price: 35,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 27)],
      },
      {
        id: "aa-oc05",
        name: "Nan Ru Chicken",
        description: "南乳鸡.",
        price: 35,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 27)],
      },
      {
        id: "aa-oc06",
        name: "Kung Pao Chicken in Crispy Yam Ring",
        description: "佛钵宫保雞丁. Served in a yam basket.",
        price: 40,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 35)],
      },
      {
        id: "aa-oc07",
        name: "Steam Chicken with Shallot Onion Oil",
        description: "葱油蒸鸡. Served as a half chicken.",
        price: 60,
        badge: "Signature",
        image: IMG.chicken,
      },
      {
        id: "aa-oc08",
        name: "Steamed Salted Chicken with Chinese Herbs",
        description: "咸香蒸鸡. Served as a half chicken.",
        price: 60,
        image: IMG.chicken,
      },
      {
        id: "aa-oc09",
        name: "Teriyaki Chicken with Pickled Pumpkin",
        description: "日式照烧汁炸鸡配腌制南瓜.",
        price: 35,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 27)],
      },
      {
        id: "aa-oc10",
        name: "Lotus Leaf Steam Chicken",
        description: "荷叶蒸鸡. Served as a half chicken, wrapped in lotus leaf.",
        price: 68,
        badge: "Signature",
        image: IMG.chicken,
      },
    ],
  },

  {
    id: "calamari",
    name: "Calamari",
    items: [
      {
        id: "aa-ca01",
        name: "Salt & Pepper Calamari",
        description: "椒鹽.",
        price: 30,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 25)],
      },
      {
        id: "aa-ca02",
        name: "Salted Egg Yolk Calamari",
        description: "咸蛋.",
        price: 32,
        badge: "Signature",
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 26)],
      },
      {
        id: "aa-ca03",
        name: "Fried Sotong",
        description: "油炸.",
        price: 30,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 25)],
      },
      {
        id: "aa-ca04",
        name: "Grilled Teriyaki Cuttlefish",
        description: "烤日式照烧汁鱿鱼.",
        price: 30,
        image: IMG.prawn,
        modifierGroups: [smallMediumGroup(0, 25)],
      },
    ],
  },

  {
    id: "beef",
    name: "Beef",
    items: [
      {
        id: "aa-bf01",
        name: "Ginger & Onion Beef",
        description: "姜沫牛肉.",
        price: 30,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 25)],
      },
      {
        id: "aa-bf02",
        name: "Deep Fried Beef Strips, Sweet & Spicy",
        description: "干扁牛肉.",
        price: 30,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 25)],
      },
      {
        id: "aa-bf03",
        name: "Black Pepper Beef",
        description: "黑椒牛粒.",
        price: 30,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 25)],
      },
    ],
  },

  {
    id: "lamb",
    name: "Lamb",
    items: [
      {
        id: "aa-lb01",
        name: "Marmite Lamb",
        description: "妈蜜羊扒.",
        price: 50,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 38)],
      },
      {
        id: "aa-lb02",
        name: "Black Pepper Lamb",
        description: "黑椒羊扒.",
        price: 50,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 38)],
      },
      {
        id: "aa-lb03",
        name: "BBQ Lamb",
        description: "烧烤酱.",
        price: 50,
        image: IMG.chicken,
        modifierGroups: [smallMediumGroup(0, 38)],
      },
    ],
  },

  {
    id: "omelette",
    name: "Omelette",
    items: [
      {
        id: "aa-om01",
        name: "Farm Fresh Eggs with Onions",
        description: "大葱煎蛋.",
        price: 18,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 12)],
      },
      {
        id: "aa-om02",
        name: "Heirloom Tomato Egg",
        description: "番茄蛋.",
        price: 20,
        badge: "Signature",
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 18)],
      },
      {
        id: "aa-om03",
        name: "Fu Yong Egg",
        description: "芙蓉蛋.",
        price: 18,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 12)],
      },
      {
        id: "aa-om04",
        name: "Heirloom Tomato Egg with Tiger Prawns",
        description: "传家宝番茄大虾.",
        price: 35,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 33)],
      },
    ],
  },

  {
    id: "tofu",
    name: "Homemade Tofu",
    items: [
      {
        id: "aa-bc01",
        name: "Steamed Beancurd with Shrimp",
        description: "虾子滑豆腐.",
        price: 28,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 20)],
      },
      {
        id: "aa-bc02",
        name: "Tofu Bliss with Kailan & Floss",
        description: "鸡松芥兰豆腐.",
        price: 22,
        badge: "Signature",
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 16)],
      },
      {
        id: "aa-bc03",
        name: "Ma Po Tofu",
        description: "麻婆豆腐. Sezchuan-pepper sauce.",
        price: 20,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 15)],
      },
      {
        id: "aa-bc04",
        name: "Emperor Beancurd",
        description: "霸王豆腐.",
        price: 20,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 15)],
      },
      {
        id: "aa-bc05",
        name: "Alu-Alu Signature Tofu",
        description: "招牌豆腐.",
        price: 30,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 25)],
      },
      {
        id: "aa-bc06",
        name: "Beancurd with Minced Chicken",
        description: "肉碎豆腐.",
        price: 20,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 15)],
      },
      {
        id: "aa-bc07",
        name: "Beancurd with Pumpkin Sauce",
        description: "自制南瓜豆腐.",
        price: 20,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 15)],
      },
      {
        id: "aa-bc08",
        name: "Claypot Seafood Tofu",
        description: "海鲜沙煲豆付.",
        price: 30,
        badge: "Signature",
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 28)],
      },
      {
        id: "aa-bc09",
        name: "Braised Teriyaki Tofu with Chicken Floss",
        description: "鸡肉碎及蛋丝焖日式照烧汁豆腐.",
        price: 22,
        image: IMG.tofu,
        modifierGroups: [smallMediumGroup(0, 14)],
      },
    ],
  },

  {
    id: "vegetables",
    name: "Organic Vegetables",
    items: [
      {
        id: "aa-vg01",
        name: "Kam Heong Stir-Fried Eggplant",
        description: "金香茄子.",
        price: 20,
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 18)],
      },
      {
        id: "aa-vg02",
        name: "Local Spinach in Superior Broth",
        description: "上汤苋菜.",
        price: 20,
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 18)],
      },
      {
        id: "aa-vg03",
        name: "Stir-Fried Organic Vegetable with Garlic",
        description: "蒜香有机菜. Today's pick from the farm.",
        price: 18,
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 12)],
      },
      {
        id: "aa-vg04",
        name: "Salted Egg Bitter Gourd",
        description: "咸蛋苦瓜.",
        price: 20,
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 18)],
      },
      {
        id: "aa-vg05",
        name: "Signature Kailan with Mushrooms",
        description: "翡翠鸳鸯芥兰.",
        price: 20,
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 18)],
      },
      {
        id: "aa-vg06",
        name: "Sawi Keriting with Fu Yee",
        description: "黄芽白腐乳. Curly mustard greens with fermented bean curd.",
        price: 18,
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 12)],
      },
      {
        id: "aa-vg07",
        name: "Sambal Kangkung with Peeled Prawns",
        description: "马来风光炒虾球.",
        price: 28,
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 20)],
      },
      {
        id: "aa-vg08",
        name: "Kailan with Scallops XO",
        description: "带子芥兰.",
        price: 52,
        badge: "Signature",
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 41)],
      },
      {
        id: "aa-vg09",
        name: "Malabar Spinach with Ikan Bilis & Dried Shrimp",
        description: "虾米江鱼仔炒帝王苗.",
        price: 28,
        image: IMG.veg,
        modifierGroups: [smallMediumGroup(0, 20)],
      },
    ],
  },

  {
    id: "dessert",
    name: "Dessert",
    items: [
      {
        id: "aa-ds01",
        name: "Coconut Pudding (Whole Coconut)",
        description: "椰子布丁. Set inside a young coconut.",
        price: 15,
        badge: "Signature",
        image: IMG.dessert,
      },
      {
        id: "aa-ds02",
        name: "Coconut Pudding (Small)",
        description: "椰子布丁. Single-serve container.",
        price: 5,
        image: IMG.dessert,
      },
      {
        id: "aa-ds03",
        name: "Chinese Pancake with Lotus Paste",
        description: "莲蓉窝饼. Wo Peng-style.",
        price: 18,
        image: IMG.dessert,
      },
      {
        id: "aa-ds04",
        name: "Bloom & Glow Marine Collagen Jelly",
        description: "鱼鳞冻. House-made fish-skin collagen jelly.",
        price: 9.9,
        badge: "Signature",
        image: IMG.dessert,
      },
    ],
  },
];
