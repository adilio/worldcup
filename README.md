# 4dl World Cup 2026

A simple, stadium-first World Cup 2026 match tracker. Defaults to **BC Place** in
Vancouver; pick any host stadium to see its past, live, and upcoming matches.

Live at **worldcup.4dl.ca**.

## Why

It answers one question well: _what World Cup matches are happening at my
preferred stadium, what's the score, and when's the next one?_ Static-first,
live-enhanced, no login, no database, free APIs only. See [`PLAN.md`](./PLAN.md)
for the full product spec.

## Data strategy

The app never depends on a keyed API to render. Four layers, best available wins:

1. **Static spine** — `public/data/world-cup-2026-static.json`, the source of truth
   for fixtures/venue/kickoff/stage. Always present, committed to the repo.
2. **football-data.org** free tier (competition code `WC`, 10 req/min) — status &
   scores, fetched only through the Netlify Function so the key stays server-side.
3. **openfootball live mirror** — same schema as the spine, secondary fallback.
4. **Degraded UI** — if no live source responds, the spine still renders with a
   status line.

Live data only _decorates_ the spine. Merge joins on the FIFA `matchNumber` (with
a stadium + date + kickoff-slot backstop), never on team names, and venue is never
taken from a live provider — so BC Place matches never drop out of the default view.

## Stack

Vite + Preact + TypeScript, plain CSS, Vitest, Netlify + Netlify Functions.

## Develop

```bash
npm install
npm run dev          # Vite dev server (function falls back to the static spine)
```

For the live function locally, run through Netlify Dev so the function is served:

```bash
netlify dev          # proxies /.netlify/functions/matches
```

## Build, test, seed

```bash
npm run build        # tsc -b && vite build → dist/
npm run typecheck    # tsc -b --noEmit
npm test             # vitest run (merge + status + venue normalization)
npm run seed         # rebuild the static spine from openfootball
```

The seed step (`scripts/seed.mjs`) fetches openfootball, converts offset times
(`13:00 UTC-6`) to ISO `kickoffUtc`, assigns `matchNumber`, normalizes every venue
through the shared map, and writes the static JSON.

## Environment variables

See [`.env.example`](./.env.example). Only configure providers actively in use:

```
FOOTBALL_DATA_API_TOKEN=     # required for the live layer (free tier)
FOOTBALL_DATA_BASE_URL=https://api.football-data.org/v4
```

Without a token the function serves the static spine with `fallbackUsed: true`.

## Deploy

Netlify reads [`netlify.toml`](./netlify.toml): `npm run build`, publish `dist/`,
functions from `netlify/functions`. Set `FOOTBALL_DATA_API_TOKEN` in the Netlify
site env, then point **worldcup.4dl.ca** at the Netlify domain.
