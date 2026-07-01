# 4dl World Cup 2026

A simple, stadium-first World Cup 2026 match tracker. Opens on **All stadiums**
(the selector leads with Vancouver / BC Place); pick any host stadium to see its
past, live, and upcoming matches.

Live at **worldcup.4dl.ca**.

## Why

It answers one question well: _what World Cup matches are happening at my
preferred stadium, what's the score, and when's the next one?_ Static-first,
live-enhanced, no login, no database, free APIs only. See [`PLAN.md`](./PLAN.md)
for the full product spec.

## Features

- **Stadium selector** — city-led labels (`Vancouver (BC Place)`), plus an
  All-stadiums view. The choice is saved in `localStorage`.
- **Tabs** — Today, Bracket, Upcoming, Results, All. The active tab is written to
  the URL (`?tab=…`) so any view is linkable and back/forward works.
- **Hero card** — the live match, else the next kickoff, else the last result for
  the selected stadium.
- **Match cards** — home/away with team flags and FIFA ranking, score or kickoff,
  status, stage/group, city + stadium, and dual **local + venue-local** times.
- **Knockout bracket** — Round of 32 → Final with connector lines and a separate
  third-place match; slots resolve as results come in.
- **Live polish** — estimated elapsed/stoppage clock, and a "scored ⇒ finished"
  guard for when the provider status lags the score.
- **Penalty shootouts** — shown as `(4–3 pens)` on cards and in the bracket.
- **No-spoiler mode** — hides scores and result states (also saved locally).
- **Per-match actions** — native share (clipboard fallback) and add-to-calendar
  (`.ics`).
- **Installable PWA** with an OpenGraph share card for link previews.
- **Graceful degradation** — the static schedule always renders, with a data-source
  and last-checked status line.

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
