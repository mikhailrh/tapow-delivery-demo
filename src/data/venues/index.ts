import { MENU, type MenuCategory } from "../menu";

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
  menu: MENU,
};

export const NOKO_NOKO_VENUE: Venue = {
  slug: "noko-noko",
  name: "noko-noko",
  tagline: "Multi-tenant smoke-test venue.",
  address: "Lot 12, Jalan Lintas, 88300 Kota Kinabalu, Sabah",
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
  hours: standardHours(),
  menu: MENU,
};

export const VENUES: Record<string, Venue> = {
  [FOWLBOYS_VENUE.slug]: FOWLBOYS_VENUE,
  [NOKO_NOKO_VENUE.slug]: NOKO_NOKO_VENUE,
};

export const DEFAULT_VENUE_SLUG = "fowlboys";

export function resolveVenue(slug: string | null | undefined): Venue {
  if (slug && Object.prototype.hasOwnProperty.call(VENUES, slug)) {
    return VENUES[slug];
  }
  return VENUES[DEFAULT_VENUE_SLUG];
}
