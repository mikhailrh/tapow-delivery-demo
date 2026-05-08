import type { MenuCategory } from "../menu";
import { FOWLBOYS_MENU } from "../menus/fowlboys";
import { KOHINOOR_MENU } from "../menus/kohinoor";
import { GOOJIBURG_MENU } from "../menus/goojiburg";
import { ALU_ALU_KITCHEN_MENU } from "../menus/alu-alu-kitchen";

export type DayHours = {
  closed: boolean;
  openMinutes: number;
  closeMinutes: number;
};

export type WeekHours = DayHours[];

export type BrandTokens = {
  green: string;
  ink: string;
  muted: string;
  canvas: string;
};

export type Cuisine =
  | "Malaysian"
  | "Western"
  | "Asian"
  | "Chinese"
  | "Japanese"
  | "Indian"
  | "Cafe"
  | "Bar"
  | "Seafood"
  | "Italian";

export type PriceTier = 1 | 2 | 3;

export type VenueOffer = {
  label: string;
  pillColor?: string;
};

export type Venue = {
  slug: string;
  name: string;
  tagline?: string;
  address: string;
  ssm: string;
  sstRegistrationNumber?: string;
  brandTokens: BrandTokens;
  orderIdPrefix: string;
  kitchenPrepDefaultMinutes: number;
  deliveryMinSubtotal: number;
  hours: WeekHours;
  menu: MenuCategory[];
  /* Discovery-screen metadata. */
  cuisine: Cuisine;
  priceTier: PriceTier;
  rating: number;
  ratingCount: number;
  estimatedDeliveryMinutes: [number, number];
  deliveryFee: number;
  heroImage: string;
  isOpen: boolean;
  hasOffer?: VenueOffer;
};

const standardHours = (): WeekHours => [
  { closed: false, openMinutes: 12 * 60, closeMinutes: 22 * 60 },
  { closed: false, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
  { closed: false, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
  { closed: false, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
  { closed: false, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
  { closed: false, openMinutes: 11 * 60, closeMinutes: 23 * 60 },
  { closed: false, openMinutes: 11 * 60, closeMinutes: 23 * 60 },
];

const lateHours = (): WeekHours => [
  { closed: false, openMinutes: 16 * 60, closeMinutes: 24 * 60 },
  { closed: true, openMinutes: 0, closeMinutes: 0 },
  { closed: false, openMinutes: 17 * 60, closeMinutes: 24 * 60 },
  { closed: false, openMinutes: 17 * 60, closeMinutes: 24 * 60 },
  { closed: false, openMinutes: 17 * 60, closeMinutes: 24 * 60 },
  { closed: false, openMinutes: 17 * 60, closeMinutes: 24 * 60 },
  { closed: false, openMinutes: 17 * 60, closeMinutes: 24 * 60 },
];

const cafeHours = (): WeekHours => [
  { closed: false, openMinutes: 8 * 60, closeMinutes: 19 * 60 },
  { closed: false, openMinutes: 7 * 60, closeMinutes: 19 * 60 },
  { closed: false, openMinutes: 7 * 60, closeMinutes: 19 * 60 },
  { closed: false, openMinutes: 7 * 60, closeMinutes: 19 * 60 },
  { closed: false, openMinutes: 7 * 60, closeMinutes: 19 * 60 },
  { closed: false, openMinutes: 7 * 60, closeMinutes: 21 * 60 },
  { closed: false, openMinutes: 8 * 60, closeMinutes: 21 * 60 },
];

/* Stable Unsplash food/restaurant photos. Swap any that 404 in production. */
const IMG = {
  friedChicken:
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1000&q=80&auto=format&fit=crop",
  agaveBar:
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1000&q=80&auto=format&fit=crop",
  seafoodPlatter:
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1000&q=80&auto=format&fit=crop",
  shellfish:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&q=80&auto=format&fit=crop",
  steak:
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&q=80&auto=format&fit=crop",
  chineseDimSum:
    "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1000&q=80&auto=format&fit=crop",
  asianBowl:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=80&auto=format&fit=crop",
  italianPasta:
    "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=1000&q=80&auto=format&fit=crop",
  indianCurry:
    "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=1000&q=80&auto=format&fit=crop",
  cafeBrunch:
    "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1000&q=80&auto=format&fit=crop",
  cocktailBar:
    "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1000&q=80&auto=format&fit=crop",
  pourover:
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000&q=80&auto=format&fit=crop",
  smashburger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&q=80&auto=format&fit=crop",
};

export const FOWLBOYS_VENUE: Venue = {
  slug: "fowlboys",
  name: "FowlBoys Diner",
  tagline: "Fried chicken, the way it should be.",
  address: "The Campus, Jalan Ampang, 50450 Kuala Lumpur",
  ssm: "1234567-A",
  sstRegistrationNumber: "B23-1234567-12345678",
  brandTokens: {
    green: "#06C167",
    ink: "#0A0A0A",
    muted: "#6B6B6B",
    canvas: "#F6F6F6",
  },
  orderIdPrefix: "FB",
  kitchenPrepDefaultMinutes: 25,
  deliveryMinSubtotal: 25,
  hours: standardHours(),
  menu: FOWLBOYS_MENU,
  cuisine: "Western",
  priceTier: 2,
  rating: 4.7,
  ratingCount: 1240,
  estimatedDeliveryMinutes: [25, 35],
  deliveryFee: 5,
  heroImage: IMG.friedChicken,
  isOpen: true,
  hasOffer: { label: "Free delivery over RM40" },
};

export const NOKO_NOKO_VENUE: Venue = {
  slug: "noko-noko",
  name: "Noko Noko",
  tagline: "Agave bar with small plates.",
  address: "Plaza Damansara, 60000 Kuala Lumpur",
  ssm: "0000000-A",
  sstRegistrationNumber: "",
  brandTokens: {
    green: "#0EA5E9",
    ink: "#0F172A",
    muted: "#64748B",
    canvas: "#F1F5F9",
  },
  orderIdPrefix: "NN",
  kitchenPrepDefaultMinutes: 20,
  deliveryMinSubtotal: 20,
  hours: lateHours(),
  menu: [],
  cuisine: "Bar",
  priceTier: 3,
  rating: 4.6,
  ratingCount: 312,
  estimatedDeliveryMinutes: [30, 45],
  deliveryFee: 7,
  heroImage: IMG.agaveBar,
  isOpen: true,
  hasOffer: { label: "20% off select items" },
};

export const GOOJIBURG_VENUE: Venue = {
  slug: "goojiburg",
  name: "Goojiburg",
  tagline: "Smashburgers, hot honey chicken, big energy.",
  address: "Dewan Damai, 88000 Kota Kinabalu",
  ssm: "GJB-011",
  brandTokens: {
    green: "#06C167",
    ink: "#0A0A0A",
    muted: "#6B6B6B",
    canvas: "#F6F6F6",
  },
  orderIdPrefix: "GJ",
  kitchenPrepDefaultMinutes: 20,
  deliveryMinSubtotal: 10,
  hours: standardHours(),
  menu: GOOJIBURG_MENU,
  cuisine: "Western",
  priceTier: 2,
  rating: 5.0,
  ratingCount: 23,
  estimatedDeliveryMinutes: [20, 30],
  deliveryFee: 5,
  heroImage: IMG.smashburger,
  isOpen: true,
  hasOffer: { label: "First delivery RM2.49" },
};

const KK_VENUES: Venue[] = [
  {
    slug: "alu-alu-kitchen",
    name: "Alu-Alu Kitchen",
    tagline: "Freshly served from farm to your dining table.",
    address: "Bayu Indah, Kelombong, 88450 Kota Kinabalu",
    ssm: "AAK-001",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "AAK",
    kitchenPrepDefaultMinutes: 30,
    deliveryMinSubtotal: 30,
    hours: standardHours(),
    menu: ALU_ALU_KITCHEN_MENU,
    cuisine: "Seafood",
    priceTier: 2,
    rating: 4.8,
    ratingCount: 870,
    estimatedDeliveryMinutes: [30, 40],
    deliveryFee: 6,
    heroImage: IMG.seafoodPlatter,
    isOpen: true,
    hasOffer: { label: "Free butter prawns over RM100" },
  },
  {
    slug: "welcome-seafood",
    name: "Welcome Seafood Restaurant",
    tagline: "KK seafood institution since 1986.",
    address: "Lot 1-2, Kg. Air, 88000 Kota Kinabalu",
    ssm: "WSR-002",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "WS",
    kitchenPrepDefaultMinutes: 35,
    deliveryMinSubtotal: 40,
    hours: standardHours(),
    menu: [],
    cuisine: "Seafood",
    priceTier: 3,
    rating: 4.5,
    ratingCount: 1980,
    estimatedDeliveryMinutes: [35, 50],
    deliveryFee: 8,
    heroImage: IMG.shellfish,
    isOpen: true,
  },
  {
    slug: "upperstar",
    name: "Upperstar",
    tagline: "Steaks, pizzas, and a long beer list.",
    address: "Suria Sabah Mall, 88000 Kota Kinabalu",
    ssm: "USR-003",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "UPS",
    kitchenPrepDefaultMinutes: 25,
    deliveryMinSubtotal: 25,
    hours: standardHours(),
    menu: [],
    cuisine: "Western",
    priceTier: 2,
    rating: 4.4,
    ratingCount: 1560,
    estimatedDeliveryMinutes: [25, 35],
    deliveryFee: 5,
    heroImage: IMG.steak,
    isOpen: true,
    hasOffer: { label: "Buy 1 get 1 free pizza" },
  },
  {
    slug: "suang-tian",
    name: "Suang Tian",
    tagline: "Cantonese kitchen, Sabah seafood.",
    address: "Bandaran Berjaya, 88000 Kota Kinabalu",
    ssm: "STC-004",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "ST",
    kitchenPrepDefaultMinutes: 30,
    deliveryMinSubtotal: 30,
    hours: standardHours(),
    menu: [],
    cuisine: "Chinese",
    priceTier: 2,
    rating: 4.6,
    ratingCount: 720,
    estimatedDeliveryMinutes: [30, 45],
    deliveryFee: 6,
    heroImage: IMG.chineseDimSum,
    isOpen: true,
  },
  {
    slug: "chilli-vanilla",
    name: "Chilli Vanilla",
    tagline: "Bosnian-Asian fusion bistro.",
    address: "Lorong Singgah Mata 2, 88300 Kota Kinabalu",
    ssm: "CHV-005",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "CHV",
    kitchenPrepDefaultMinutes: 30,
    deliveryMinSubtotal: 30,
    hours: standardHours(),
    menu: [],
    cuisine: "Asian",
    priceTier: 2,
    rating: 4.7,
    ratingCount: 540,
    estimatedDeliveryMinutes: [30, 40],
    deliveryFee: 6,
    heroImage: IMG.asianBowl,
    isOpen: true,
    hasOffer: { label: "10% off first order" },
  },
  {
    slug: "little-italy-kk",
    name: "Little Italy KK",
    tagline: "Wood-fired pizza, handmade pasta.",
    address: "23 Jalan Haji Saman, 88000 Kota Kinabalu",
    ssm: "LIT-006",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "LI",
    kitchenPrepDefaultMinutes: 25,
    deliveryMinSubtotal: 25,
    hours: standardHours(),
    menu: [],
    cuisine: "Italian",
    priceTier: 2,
    rating: 4.5,
    ratingCount: 980,
    estimatedDeliveryMinutes: [25, 40],
    deliveryFee: 5,
    heroImage: IMG.italianPasta,
    isOpen: true,
  },
  {
    slug: "kohinoor",
    name: "Kohinoor North Indian Restaurant",
    tagline: "North-Indian classics, tandoor specials.",
    address: "Lot 4, Anjung Perdana (The Waterfront), 88000 Kota Kinabalu",
    ssm: "KHN-007",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "KHN",
    kitchenPrepDefaultMinutes: 30,
    deliveryMinSubtotal: 10,
    hours: standardHours(),
    menu: KOHINOOR_MENU,
    cuisine: "Indian",
    priceTier: 2,
    rating: 4.0,
    ratingCount: 100,
    estimatedDeliveryMinutes: [30, 45],
    deliveryFee: 7,
    heroImage: IMG.indianCurry,
    isOpen: true,
    hasOffer: { label: "Min order RM10" },
  },
  {
    slug: "biru-biru-cafe",
    name: "Biru Biru Cafe",
    tagline: "Local brunch and ginger lemongrass tea.",
    address: "Lot 17, Beach Street, 88000 Kota Kinabalu",
    ssm: "BBC-008",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "BB",
    kitchenPrepDefaultMinutes: 20,
    deliveryMinSubtotal: 20,
    hours: cafeHours(),
    menu: [],
    cuisine: "Cafe",
    priceTier: 2,
    rating: 4.8,
    ratingCount: 690,
    estimatedDeliveryMinutes: [20, 30],
    deliveryFee: 4,
    heroImage: IMG.cafeBrunch,
    isOpen: true,
    hasOffer: { label: "Free delivery over RM30" },
  },
  {
    slug: "el-centro",
    name: "El Centro",
    tagline: "Mexican plates and frozen margaritas.",
    address: "Jalan Gaya, 88000 Kota Kinabalu",
    ssm: "ECN-009",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "ELC",
    kitchenPrepDefaultMinutes: 25,
    deliveryMinSubtotal: 25,
    hours: lateHours(),
    menu: [],
    cuisine: "Bar",
    priceTier: 2,
    rating: 4.4,
    ratingCount: 880,
    estimatedDeliveryMinutes: [25, 40],
    deliveryFee: 5,
    heroImage: IMG.cocktailBar,
    isOpen: true,
  },
  {
    slug: "octoverse-coffee",
    name: "Octoverse Coffee",
    tagline: "Specialty roastery, single-origin pours.",
    address: "Lot G-12, Plaza 333, Tanjung Aru, 88100 Kota Kinabalu",
    ssm: "OCV-010",
    brandTokens: {
      green: "#06C167",
      ink: "#0A0A0A",
      muted: "#6B6B6B",
      canvas: "#F6F6F6",
    },
    orderIdPrefix: "OCV",
    kitchenPrepDefaultMinutes: 15,
    deliveryMinSubtotal: 15,
    hours: cafeHours(),
    menu: [],
    cuisine: "Cafe",
    priceTier: 2,
    rating: 4.9,
    ratingCount: 220,
    estimatedDeliveryMinutes: [15, 25],
    deliveryFee: 4,
    heroImage: IMG.pourover,
    isOpen: false,
  },
];

export const VENUES: Record<string, Venue> = {
  [GOOJIBURG_VENUE.slug]: GOOJIBURG_VENUE,
  [FOWLBOYS_VENUE.slug]: FOWLBOYS_VENUE,
  [NOKO_NOKO_VENUE.slug]: NOKO_NOKO_VENUE,
  ...Object.fromEntries(KK_VENUES.map((v) => [v.slug, v])),
};

export const VENUE_LIST: Venue[] = Object.values(VENUES);

export const DEFAULT_VENUE_SLUG = "fowlboys";

export function resolveVenue(slug: string | null | undefined): Venue {
  if (slug && Object.prototype.hasOwnProperty.call(VENUES, slug)) {
    return VENUES[slug];
  }
  return VENUES[DEFAULT_VENUE_SLUG];
}
