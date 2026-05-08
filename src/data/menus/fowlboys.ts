import type { MenuCategory, ModifierGroup, ModifierOption } from "../menu";

/**
 * FowlBoys Diner (The Campus, Ampang KL).
 *
 * Modifier shapes used:
 * - Combo items (Bone In, Tenders, Wings) have four required groups:
 *   size (kind: "size"), heat, dip, side. Heat options on Xtra/XX Hot tiers
 *   carry priceDelta 2.5 with perPiece: true — the size's pieces multiply
 *   the upcharge (3 pieces XX Hot = +RM 7.50).
 * - heatOnly items (sandwiches that come at one spice level) have just the
 *   heat group, required.
 * - A few items (pasta, house salad) have an optional add-on group.
 */

const HEAT_OPTIONS: ModifierOption[] = [
  { id: "neat", label: "Neat" },
  { id: "mild", label: "Mild" },
  { id: "hot", label: "Hot" },
  { id: "xtra-hot", label: "Xtra Hot", priceDelta: 2.5, perPiece: true },
  { id: "xx-hot", label: "XX Hot", priceDelta: 2.5, perPiece: true },
];

const DIP_OPTIONS: ModifierOption[] = [
  { id: "ranch", label: "Ranch" },
  { id: "hot-honey-ranch", label: "Hot Honey Ranch" },
  { id: "cluck-sauce", label: "Cluck Sauce" },
  { id: "chicken-gravy", label: "Chicken Gravy" },
  { id: "garlic-aioli", label: "Garlic Aioli" },
];

const SIDE_OPTIONS: ModifierOption[] = [
  { id: "house-slaw", label: "House Slaw" },
  { id: "mash-gravy", label: "Mash & Gravy" },
];

const heatGroup = (id = "heat", label = "Heat"): ModifierGroup => ({
  id,
  label,
  required: true,
  options: HEAT_OPTIONS,
});

const dipGroup: ModifierGroup = {
  id: "dip",
  label: "Dip",
  required: true,
  options: DIP_OPTIONS,
};

const sideGroup: ModifierGroup = {
  id: "side",
  label: "Pick 1 side",
  required: true,
  options: SIDE_OPTIONS,
};

const sizeGroup = (options: ModifierOption[]): ModifierGroup => ({
  id: "size",
  label: "Pick a size",
  required: true,
  kind: "size",
  options,
});

const BONELESS_THIGH_ADDON: ModifierOption = {
  id: "boneless-thigh",
  label: "Add boneless fried chicken thigh",
  priceDelta: 8,
};

const optionalThighAddon: ModifierGroup = {
  id: "addons",
  label: "Add extras",
  required: false,
  multi: true,
  options: [BONELESS_THIGH_ADDON],
};

export const FOWLBOYS_MENU: MenuCategory[] = [
  {
    id: "fried-chicken",
    name: "Fried Chicken",
    items: [
      {
        id: "bone-in",
        name: "Bone In",
        description:
          "Our signature buttermilk-brined, double-dipped fried chicken. Choose heat, dip, a side and biscuit included.",
        price: 30,
        image: "/images/off-the-hook.jpeg",
        modifierGroups: [
          sizeGroup([
            { id: "bone-in-2", label: "2 pieces", priceDelta: 0, pieces: 2 },
            { id: "bone-in-3", label: "3 pieces", priceDelta: 9, pieces: 3 },
          ]),
          heatGroup(),
          dipGroup,
          sideGroup,
        ],
      },
      {
        id: "tenders",
        name: "Tenders",
        description:
          "Hand-breaded chicken tenders. Choose heat, dip, a side and biscuit included.",
        price: 22,
        modifierGroups: [
          sizeGroup([
            { id: "tenders-3", label: "3 pieces", priceDelta: 0, pieces: 3 },
            { id: "tenders-5", label: "5 pieces", priceDelta: 5, pieces: 5 },
          ]),
          heatGroup(),
          dipGroup,
          sideGroup,
        ],
      },
      {
        id: "wings",
        name: "Wings",
        description:
          "Crispy bone-in wings. Choose heat, dip, a side and biscuit included.",
        price: 25,
        modifierGroups: [
          sizeGroup([
            { id: "wings-2", label: "2 pieces", priceDelta: 0, pieces: 2 },
            { id: "wings-4", label: "4 pieces", priceDelta: 13, pieces: 4 },
          ]),
          heatGroup(),
          dipGroup,
          sideGroup,
        ],
      },
    ],
  },
  {
    id: "all-day-breakfast",
    name: "All-Day Breakfast",
    items: [
      {
        id: "chonky-breakkie",
        name: "Chonky Breakkie",
        description:
          "Two pancakes with two fried eggs, chicken sausage, smokey baked beans & tater tots.",
        price: 42,
      },
      {
        id: "tender-lovin",
        name: "Tender Lovin'",
        description: "Two pancakes with two chicken tenders & two fried eggs.",
        price: 24,
      },
      {
        id: "morning-glory",
        name: "Morning Glory",
        description:
          "Chicken sausage patty with scrambled egg, American cheese & creamy onion mayo on English muffin with tater tots.",
        price: 24,
      },
      {
        id: "eggs-benedict-salmon",
        name: "Eggs Benedict (Salmon)",
        description:
          "Poached egg, smoked salmon, baby spinach, hollandaise sauce, English muffin.",
        price: 22,
      },
      {
        id: "buttermilk-pancakes",
        name: "Buttermilk Pancakes",
        description: "Buttermilk pancake stack of three, served with maple butter.",
        price: 20,
      },
      {
        id: "french-toast",
        name: "French Toast",
        description: "Brioche bread French toast, powdered sugar & maple butter.",
        price: 20,
      },
      {
        id: "slow-jamz",
        name: "Slow Jamz",
        description:
          "Peanut butter & jam filled French toast with vanilla ice cream & salted caramel.",
        price: 24,
      },
      {
        id: "chicken-waffle",
        name: "Chicken & Waffle",
        description:
          "Two bone-in fried chicken OR five tenders, buttermilk waffle, Fowl Jam & a glass of maple syrup.",
        price: 35,
        badge: "Signature",
      },
    ],
  },
  {
    id: "sandwiches",
    name: "Sandwiches",
    items: [
      {
        id: "nashville-sandwich",
        name: "Nashville Sandwich",
        description:
          "Nashville chicken thigh, house slaw, house pickles, comeback sauce, pretzel buns.",
        price: 26,
        modifierGroups: [heatGroup()],
      },
      {
        id: "og-sandwich",
        name: "OG Sandwich",
        description:
          "Chicken thigh, jalapeño pickles, Cluck Sauce, Fowl Jam, potato buns.",
        price: 24,
        modifierGroups: [heatGroup()],
      },
      {
        id: "motherclucker",
        name: "Motherclucker",
        description:
          "Chicken thigh, house slaw, jalapeño pickles, Fowl Jam, potato buns.",
        price: 25,
        modifierGroups: [heatGroup()],
      },
      {
        id: "sugar-daddy",
        name: "Sugar Daddy",
        description:
          "Honey butter chicken thigh, house slaw, house pickles, garlic mayo, potato buns.",
        price: 25,
        modifierGroups: [heatGroup()],
      },
      {
        id: "off-the-hook",
        name: "Off The Hook",
        description:
          "Breaded perch fillet, house tartare, cheese slice, potato buns.",
        price: 24,
        image: "/images/off-the-hook.jpeg",
      },
      {
        id: "the-cluckfather",
        name: "The Cluckfather",
        description:
          "Chicken thigh, American cheese, tomato, mix lettuce, pickle onion, buffalo mayo & pretzel buns.",
        price: 28,
        modifierGroups: [heatGroup()],
      },
      {
        id: "chicken-sando",
        name: "Chicken Sando",
        description:
          "Chicken thigh, boiled egg, American cheese, tomato, salad, pesto mayo & brioche bread.",
        price: 26,
        modifierGroups: [heatGroup()],
      },
      {
        id: "nash-dog",
        name: "Nash Dog",
        description:
          "Nashville chorizo sausage, coleslaw, comeback sauce, mustard mayo, potato roll & pickle onion.",
        price: 26,
      },
      {
        id: "prawn-hustle",
        name: "Prawn Hustle",
        description:
          "Fried tiger prawn meat, tartare sauce, marinara mayo & potato roll.",
        price: 28,
      },
    ],
  },
  {
    id: "plates",
    name: "Plates",
    items: [
      {
        id: "salmon-sitch",
        name: "The Salmon Sitch",
        description:
          "Pan seared salmon with mash potato, sauteed spinach & cherry tomato with creamy capers sauce.",
        price: 48,
      },
      {
        id: "baangers-mash",
        name: "Baangers & Mash",
        description: "Two lamb sausage with mash potato, onion gravy & peas.",
        price: 42,
      },
    ],
  },
  {
    id: "pasta",
    name: "Pasta",
    items: [
      {
        id: "penne-arrabiata",
        name: "Penne Arrabiata",
        description: "Penne with house made tomato based sauce.",
        price: 24,
        modifierGroups: [optionalThighAddon],
      },
      {
        id: "penne-pesto",
        name: "Penne Pesto",
        description: "Penne with house made creamy pesto.",
        price: 24,
        modifierGroups: [optionalThighAddon],
      },
      {
        id: "penne-smokeshow",
        name: "Penne Smokeshow",
        description: "Penne with creamy sauce & smoked salmon.",
        price: 30,
      },
    ],
  },
  {
    id: "for-sharing",
    name: "For Sharing",
    items: [
      {
        id: "house-salad",
        name: "House Salad",
        description:
          "Mesclun mix, cherry tomato, crispy panko, and peanut sesame dressing.",
        price: 18,
        modifierGroups: [optionalThighAddon],
      },
      {
        id: "fried-white-bait",
        name: "Fried White Bait",
        description: "Crispy whitebait fish, mustard mayo.",
        price: 20,
      },
      {
        id: "disco-fries",
        name: "Disco Fries",
        description:
          "Chicken gravy, garlic aioli, grated cheddar cheese, pickled onion.",
        price: 20,
      },
      {
        id: "buffalo-ranch-tots",
        name: "Buffalo Ranch Tots",
        description: "Tots loaded with buffalo chicken bits, jalapeño & ranch.",
        price: 25,
      },
      {
        id: "mac-n-cheese",
        name: "Mac N Cheese",
        description: "Macaroni with three types of cheese.",
        price: 18,
      },
      {
        id: "nachos",
        name: "Nachos",
        description:
          "Corn tortilla chips, three cheese sauce, chicken chilli, pico de gallo, guacamole & sour cream.",
        price: 35,
      },
      {
        id: "loaded-fries",
        name: "Loaded Fries",
        description:
          "Shoestring fries, chicken chilli, cheddar cheese, jalapeños, ranch sauce & fried shallot.",
        price: 28,
      },
      {
        id: "hot-honey-habanero-wings",
        name: "Hot Honey Habanero Wings",
        description: "Wings coated with habanero honey.",
        price: 28,
      },
      {
        id: "tater-tots",
        name: "Tater Tots",
        description: "Crispy golden tater tots.",
        price: 18,
      },
      {
        id: "fries",
        name: "Fries",
        description: "Shoestring fries with sea salt.",
        price: 13,
      },
      {
        id: "crack-fries",
        name: "Crack Fries",
        description: "Our signature seasoned fries — dangerously good.",
        price: 15,
      },
    ],
  },
  {
    id: "drinks",
    name: "Drinks",
    items: [
      {
        id: "soft-drink",
        name: "Soft Drink",
        description: "Bottomless refill.",
        price: 9,
      },
      {
        id: "lemonade",
        name: "Lemonade",
        description: "Bottomless refill.",
        price: 9,
      },
      {
        id: "half-half",
        name: "Half & Half",
        description: "Half lemonade, half iced tea. Bottomless refill.",
        price: 9,
      },
      {
        id: "southern-iced-tea",
        name: "Southern Iced Tea",
        description: "Bottomless refill.",
        price: 9,
      },
      {
        id: "black-tea",
        name: "Black Tea",
        description: "Bottomless refill.",
        price: 9,
      },
      {
        id: "black-coffee",
        name: "Black Coffee",
        description: "Bottomless refill.",
        price: 9,
      },
    ],
  },
  {
    id: "milkshakes",
    name: "Milkshakes",
    items: [
      {
        id: "shake-vanilla",
        name: "Vanilla",
        description: "Handspun with 100% pure Australian ice cream.",
        price: 20,
      },
      {
        id: "shake-chocolate",
        name: "Chocolate",
        description: "Handspun with 100% pure Australian ice cream.",
        price: 20,
      },
      {
        id: "shake-strawberry",
        name: "Strawberry",
        description: "Handspun with 100% pure Australian ice cream.",
        price: 20,
      },
      {
        id: "shake-malted-peanut",
        name: "Malted Peanut Butter",
        description: "Handspun with 100% pure Australian ice cream.",
        price: 20,
      },
      {
        id: "shake-cereal",
        name: "Cereal",
        description: "Handspun with 100% pure Australian ice cream.",
        price: 20,
      },
      {
        id: "shake-coffee",
        name: "Coffee",
        description: "Handspun with 100% pure Australian ice cream.",
        price: 20,
      },
    ],
  },
  {
    id: "dessert",
    name: "Dessert",
    items: [
      {
        id: "lemon-meringue-pie",
        name: "Lemon Meringue Pie",
        description:
          "Almond crust with lemon curd, salted almond butter cake, swiss meringue. An exclusive creation by Tao Bakes Cakes for Fowlboys.",
        price: 20,
      },
      {
        id: "marvins-room",
        name: "Marvin's Room",
        description: "Buttermilk waffles, maple butter, whipped cream, maple syrup.",
        price: 18,
      },
    ],
  },
];
