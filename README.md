# tapow-delivery-demo

Multi-venue food delivery prototype for Tapow, launching in Kota Kinabalu. Forked from the FowlBoys × Tapow single-venue pitch demo and being refactored into a venue-aware platform.

The active venue is selected by URL slug:

- `/v/fowlboys` — FowlBoys Diner (the original demo, fully populated)
- `/v/<slug>` — any other configured venue
- `/` — falls back to FowlBoys

See [CLAUDE.md](CLAUDE.md) for architecture, conventions, and the multi-venue refactor notes.

## Stack

- Vite 8, React 19, TypeScript
- Tailwind CSS v3.4 (brand tokens are CSS variables, themed per venue)
- No router, no global state library, no animation library
- localStorage + BroadcastChannel for per-venue persistence and cross-tab sync

## Develop

```sh
npm install
npm run dev    # http://localhost:5173/v/fowlboys
npm run build  # tsc -b && vite build
npm run lint
```
