import { createContext, useContext, useState, type ReactNode } from "react";
import { resolveVenue, type BrandTokens, type Venue } from "../data/venues";
import { setActiveVenueSlug } from "../lib/sync";

const VenueContext = createContext<Venue | null>(null);

const SLUG_PATTERN = /^\/v\/([a-z0-9-]+)/i;

function parseSlugFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const m = SLUG_PATTERN.exec(window.location.pathname);
  return m ? m[1].toLowerCase() : null;
}

function applyBrandTokens(tokens: BrandTokens) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--brand-green", tokens.green);
  root.style.setProperty("--brand-ink", tokens.ink);
  root.style.setProperty("--brand-muted", tokens.muted);
  root.style.setProperty("--brand-canvas", tokens.canvas);
}

export function VenueProvider({ children }: { children: ReactNode }) {
  const [venue] = useState<Venue>(() => {
    const v = resolveVenue(parseSlugFromUrl());
    setActiveVenueSlug(v.slug);
    applyBrandTokens(v.brandTokens);
    return v;
  });

  return <VenueContext.Provider value={venue}>{children}</VenueContext.Provider>;
}

export function useVenue(): Venue {
  const ctx = useContext(VenueContext);
  if (!ctx) throw new Error("useVenue must be used inside VenueProvider");
  return ctx;
}
