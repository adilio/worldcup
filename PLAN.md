# 4dl World Cup 2026

A lightweight, mobile-first World Cup 2026 match tracker hosted at:

worldcup.4dl.ca

The app defaults to BC Place as the preferred stadium, but users can select any World Cup 2026 stadium and view past, live, and upcoming matches.

## Product Goal

Build a simple, fast, stadium-first World Cup 2026 companion app.

The app answers one question well:

What World Cup matches are happening at my preferred stadium, what is the current score or status, and when is the next match?

The first version stays intentionally lean. It avoids accounts, databases, paid APIs, admin screens, push notifications, or anything that turns this into a full tournament platform too early.

## Guiding Principles

* Keep it simple.
* Free APIs only.
* Static-first, live-enhanced.
* Mobile-first.
* No login.
* No database for v1.
* No paid dependencies.
* ~~Default to BC Place.~~ Superseded: the app now defaults to All stadiums by owner choice (see Build Progress). Venue-first design is unchanged.
* Always show stadium on match cards.
* The app stays useful even if every live score API fails.

## Confirmed Direction

| Decision | Value |
| --- | --- |
| App name | 4dl World Cup 2026 |
| Domain | worldcup.4dl.ca |
| Hosting | Netlify |
| Frontend | Vite + Preact + TypeScript |
| Backend | Netlify Functions |
| Default stadium | All stadiums (owner decision; was BC Place) |
| API policy | Free-only APIs |
| Data approach | Static schedule spine, live score enhancement on top |
| Source of truth for fixtures | Static schedule committed to the repo |
| Live enhancement | football-data.org free tier (behind the Function) |
| Secondary live fallback | openfootball live mirror |

## Core User Experience

When a user opens the app:

1. The app loads with BC Place selected by default.
2. The user sees a hero card for the next or live match at BC Place.
3. The user sees a list of all BC Place matches, including past, live, and upcoming matches.
4. Each match card clearly shows the stadium.
5. The user can change the preferred stadium using a dropdown or filter.
6. The selected stadium is saved locally in the browser.

## MVP Scope

### Must Have

* Mobile-first single page app
* App title: 4dl World Cup 2026
* Hosted at worldcup.4dl.ca
* Stadium selector
* Default selected stadium: BC Place
* Persist preferred stadium in localStorage
* Show all matches for selected stadium
* Show past, live, and future matches
* Always show stadium name on every match card
* Always show city on every match card
* Show kickoff time in the user's local time and in venue-local time
* Show match stage or group
* Show match status
* Show score when available
* Static match schedule as the always-present base layer
* Netlify Function API proxy for live data
* Free-only API usage
* Last updated timestamp
* Graceful fallback if live API fails

### Should Have

* Tabs or filters: All, Upcoming, Live, Results
* No-spoiler mode
* Add to calendar button
* Native share button
* Today's matches section
* Next match at selected stadium
* Data source banner
* API fallback warning
* Basic loading and empty states

### Nice to Have

* Favourite team filter
* Canada quick filter
* Group standings
* Scorers, if available from a free API
* Penalty shootout display
* Knockout path display
* Installable PWA
* Offline-friendly last successful response
* Host city links
* Stadium policy links
* Transit links
* Fan festival links
* Weather link for selected stadium city

### Out of Scope for v1

* User accounts
* Database
* Admin panel
* Push notifications
* Betting odds
* Predictions
* Comments or chat
* News feed
* Full player pages
* Lineup visualizer
* Interactive maps
* Native iOS or Android app
* Paid APIs

## Recommended Tech Stack

Vite, Preact, TypeScript, Netlify, Netlify Functions, plain CSS or CSS modules, Vitest.

### Why This Stack

The app has real interactive state: a stadium selector, four filters, a no-spoiler toggle, a hero card, and date-grouped lists. Vanilla DOM work gets fiddly once those compose, so a tiny component model earns its place. Preact keeps the bundle small, TypeScript catches the exact merge and status bugs that this app is most exposed to, and Vite gives a fast build with no heavy framework overhead. Netlify Functions keep the API key off the client. Easy to maintain, easy to migrate later if it ever grows.

## Data Strategy

The app uses a layered data strategy, ordered so the app never depends on a keyed provider to render.

Layer 1: Static World Cup 2026 schedule committed to the repo. This is the source of truth for fixtures, venue, kickoff, stage, and group. Seeded from openfootball. Always present.

Layer 2: Live enhancement from football-data.org free tier, fetched through the Netlify Function, merged onto the static schedule to add status and score.

Layer 3: Secondary fallback from the openfootball live mirror (upbound-web/worldcup-live.json) if football-data.org errors or quota is exhausted.

Layer 4: Graceful degraded UI. If no live source responds, the static schedule still renders with a friendly status message.

If live data is unavailable, show the static schedule and a status line:

Live score temporarily unavailable. Showing schedule data. Last checked: 2:41 PM

The key correction from earlier drafts: the static schedule is the spine, not the fallback. The live providers decorate it. The app's reliability must not hinge on any keyed API.

## API Provider Strategy

### Coverage note (confirmed)

football-data.org's free tier includes the World Cup competition (code WC), free forever, at 10 requests per minute. This was verified, so the live layer rests on a real free source rather than an assumption.

One item still to verify before launch: confirm football-data.org actually populates the per-match `venue` field for WC matches on the free tier. Some competitions return a null venue on free. If WC venue is null, the app leans entirely on the static schedule for stadium, which is fine, but this needs to be known up front since venue is the whole premise of the app.

### Static spine

Seed a static World Cup 2026 schedule from openfootball/worldcup.json (public domain, no key, all 104 matches with date, teams, group, and ground).

Purpose:

* Source of truth for fixtures, venue, stage, group, and kickoff
* Guarantees the app renders with no live API at all

### Live enhancement

Use football-data.org free tier through the Netlify Function.

Purpose:

* Match status
* Scores
* Finished results
* Scorers, where the free tier exposes them

Notes:

* Keep usage conservative, behind the Function only.
* Never expose the API key in the browser.

### Secondary fallback

Use the openfootball live mirror (upbound-web/worldcup-live.json) if football-data.org fails.

Purpose:

* Results within hours of full-time, no key required
* Same schema as the static seed, so it drops in cleanly

### Optional secondary live provider

Evaluate API-Football free tier only if football-data.org proves insufficient. Free quota is 100 requests per day, which is tight. Do not build this adapter until testing confirms it is needed.

## Match Merge Logic

Merging live data onto the static schedule is the most fragile code in the project. Two things must be specified.

### Merge key

Do not join on team names. Knockout matches read as TBD until teams resolve, so name joins break for the round of 32 and beyond. Join on the FIFA match number, which both openfootball and football-data.org expose. Populate `matchNumber` in the static seed and use it as the join key. As a backstop, match on date plus venue plus slot.

### Venue normalization

Each provider names venues differently. openfootball uses the city string "Vancouver". FIFA materials use "BC Place Vancouver". football-data.org returns its own stadium string. Every provider adapter maps its venue value to the canonical `stadiumId` ("bc-place"). Build this map explicitly and test it. A silent mismatch means BC Place matches disappear from the default view, which is the one failure the app cannot have.

## API Design

Use one backend endpoint.

GET /.netlify/functions/matches

Return all matches, not only the selected stadium. The World Cup match count is small, so client-side filtering keeps stadium switching instant and the endpoint simple to cache.

Example response shape:

```json
{
  "app": "4dl World Cup 2026",
  "defaultStadium": "BC Place",
  "source": "football-data.org",
  "fallbackUsed": false,
  "lastUpdated": "2026-06-27T19:05:00Z",
  "matches": []
}
```

The frontend polls this endpoint. The Function caches and proxies upstream, which decouples the frontend poll rate from the provider's rate limit. Many users polling every 30 seconds still result in roughly two upstream calls per minute behind a 20 to 30 second CDN cache, well under the 10 per minute free cap.

## Data Model

```typescript
export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "unknown";

export type Stadium = {
  id: string;
  name: string;
  city: string;
  country: "Canada" | "United States" | "Mexico";
  timezone: string;
};

export type Match = {
  id: string;
  providerId?: string;
  matchNumber?: number;
  stage:
    | "group"
    | "round_of_32"
    | "round_of_16"
    | "quarter_final"
    | "semi_final"
    | "third_place"
    | "final";
  group?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  kickoffUtc: string;
  stadium: string;
  stadiumId: string;
  city: string;
  country: string;
  scorers?: string[];
  lastUpdated?: string;
};
```

## Stadium Reference

Stadium metadata for the selector. The selector leads with the city, because most people recognize "Seattle" or "Vancouver" faster than "Lumen Field" or "BC Place". The dropdown shows the city as the primary label with the stadium name in parentheses, sorted by city. The app also includes an All stadiums option, with the default experience remaining Vancouver (BC Place).

The selector label is composed at render time as `City (Stadium)`, so no extra data field is needed. The match card keeps both: city as the prominent line and stadium name beneath it.

| id | selector label | city | stadium | country | timezone |
| --- | --- | --- | --- | --- | --- |
| bc-place | Vancouver (BC Place) | Vancouver | BC Place | Canada | America/Vancouver |
| bmo-field | Toronto (BMO Field) | Toronto | BMO Field | Canada | America/Toronto |
| mercedes-benz | Atlanta (Mercedes-Benz Stadium) | Atlanta | Mercedes-Benz Stadium | United States | America/New_York |
| gillette | Boston (Gillette Stadium) | Boston (Foxborough) | Gillette Stadium | United States | America/New_York |
| att | Dallas (AT&T Stadium) | Dallas (Arlington) | AT&T Stadium | United States | America/Chicago |
| nrg | Houston (NRG Stadium) | Houston | NRG Stadium | United States | America/Chicago |
| arrowhead | Kansas City (Arrowhead Stadium) | Kansas City | Arrowhead Stadium | United States | America/Chicago |
| sofi | Los Angeles (SoFi Stadium) | Los Angeles (Inglewood) | SoFi Stadium | United States | America/Los_Angeles |
| hard-rock | Miami (Hard Rock Stadium) | Miami (Miami Gardens) | Hard Rock Stadium | United States | America/New_York |
| metlife | New York New Jersey (MetLife Stadium) | New York New Jersey | MetLife Stadium | United States | America/New_York |
| lincoln-financial | Philadelphia (Lincoln Financial Field) | Philadelphia | Lincoln Financial Field | United States | America/New_York |
| levis | San Francisco Bay Area (Levi's Stadium) | San Francisco Bay Area (Santa Clara) | Levi's Stadium | United States | America/Los_Angeles |
| lumen | Seattle (Lumen Field) | Seattle | Lumen Field | United States | America/Los_Angeles |
| akron | Guadalajara (Estadio Akron) | Guadalajara | Estadio Akron | Mexico | America/Mexico_City |
| azteca | Mexico City (Estadio Banorte) | Mexico City | Estadio Banorte (Azteca) | Mexico | America/Mexico_City |
| bbva | Monterrey (Estadio BBVA) | Monterrey | Estadio BBVA | Mexico | America/Monterrey |

Verify stadium names and timezones against the final schedule before launch. FIFA also uses city-based tournament names (for example "Vancouver Stadium" for BC Place), so the venue normalization map must account for both forms. The city-led selector label happens to align with how FIFA names the venues, which is a small bonus for recognition.

## Stadium Preference

Default stadium: **All stadiums** (owner decision; the plan originally specified BC Place — see the Build Progress divergence note). `DEFAULT_STADIUM_ID = "all"`.

Local storage key: `4dl-wc2026-preferred-stadium`

Example stored value: `bc-place` (any specific stadium) or `all`.

The selector still leads with Vancouver (BC Place) and the venue-first design is unchanged; only the initial view defaults to all stadiums rather than one.

## Match Card Requirements

Every match card must show:

Home team, away team, score or kickoff time, match status, stage or group, city, stadium, date and time. The venue line leads with the city for the same recognition reason as the selector, with the stadium name second.

Example card layout:

```
Canada vs TBD
Live · 1-0
Round of 32
Vancouver · BC Place
Today · 5:00 PM
```

No-spoiler mode hides scores and result states.

Example no-spoiler card:

```
Canada vs TBD
Score hidden
Round of 32
Vancouver · BC Place
Today · 5:00 PM
```

## Timezones

The static seed comes from openfootball, which encodes kickoff as an offset string like "12:00 UTC-7" rather than ISO. The seed build step converts that to a proper ISO `kickoffUtc` value at seed time, so the running app never parses offset strings.

For display, show two times on the card: the user's local time (from the browser) and the venue-local time (from the stadium's timezone). A stadium-first app benefits from showing kickoff in the stadium's own time, especially across the three host countries. Use `Intl.DateTimeFormat` for both. No date library needed.

## Page Layout

```
Header
  4dl World Cup 2026
  worldcup.4dl.ca
Stadium selector
  Preferred stadium: BC Place
Hero card
  Live match or next match at selected stadium
Filters
  All | Upcoming | Live | Results
Match list
  Match cards grouped by date
Helpful links
  Host city links
  Stadium links
  Transit links
  Fan festival links
Footer
  Data source
  Last updated timestamp
  Fallback status
```

## Polling Strategy

The frontend polls conservatively.

If a selected-stadium match is live: refresh every 30 seconds.
If today has a selected-stadium match but it is not live: refresh every 5 minutes.
If no selected-stadium match is today: refresh every 30 minutes.

The Netlify Function caches responses with CDN headers.

Live match: CDN cache 20 to 30 seconds.
Match day: CDN cache 5 minutes.
Non-match day: CDN cache 30 minutes.

This is what keeps the app under football-data.org's 10 per minute free cap regardless of how many users are polling.

## Repo Structure

Trimmed for v1. Components split further only when a second consumer appears. One static data location. One focused test on the fragile merge and status logic.

```
4dl-world-cup-2026/
  README.md
  PLAN.md
  package.json
  netlify.toml
  vite.config.ts
  tsconfig.json
  .env.example
  public/
    favicon.svg
    app-icon.svg
    data/
      world-cup-2026-static.json
  src/
    main.tsx
    app.tsx
    components/
      AppHeader.tsx
      StadiumSelect.tsx
      MatchCard.tsx
      MatchList.tsx
      DataStatus.tsx
      EmptyState.tsx
    data/
      stadiums.ts
    lib/
      types.ts
      stadiums.ts
      matches.ts
      mergeMatches.ts
      matchStatus.ts
      formatDate.ts
      calendar.ts
      storage.ts
      apiClient.ts
    styles/
      global.css
  netlify/
    functions/
      matches.mts
  tests/
    mergeMatches.test.ts
```

Notes on the trim:

* Score and status badge rendering live inside MatchCard until a second place needs them.
* The static schedule lives only in `public/data/world-cup-2026-static.json`. It is fetchable and editable without a rebuild, which matters if a kickoff time needs patching mid-tournament.
* `mergeMatches.ts` is the merge-key plus venue-normalization logic, and it is the one piece with a test from day one.

## Netlify Configuration

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
```

## Environment Variables

```
FOOTBALL_DATA_API_TOKEN=
FOOTBALL_DATA_BASE_URL=https://api.football-data.org/v4
API_FOOTBALL_KEY=
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
ENABLE_API_FOOTBALL=false
```

Only configure the providers actively in use. Do not wire API-Football until testing proves football-data.org is not enough.

## Build Progress

Living status log, updated as the build proceeds.

**Current status (2026-06-30):** Live in production at **worldcup.4dl.ca** (Netlify deploy + Cloudflare domain done). Phases 1–3 complete; Phase 4 ongoing with several owner-chosen feature adds beyond the original plan. 31 tests passing, `tsc` clean, `vite build` green. All four data layers verified end-to-end. Committed and pushed to `main`.

Remaining: issue #30 (verify football-data.org `venue` field with a real token, in production), plus the proposed improvements below.

**YAGNI review (2026-06-30):** The app is still lean and on-spec — no database, no auth, no speculative abstraction; components stay small (largest is `app.tsx` at ~230 lines) and the genuinely complex code (`mergeMatches`, `BracketView` positioning) is load-bearing, not speculative. Two dead exports were pruned (`elapsedLabel` in `matchStatus.ts`, `venueDateKey` in `formatDate.ts` — both unreferenced; `noUnusedLocals` doesn't catch unused *exports*, so they slipped through). One stale comment fixed. `README.md` refreshed to match current functionality. See "Proposed Improvements" for the follow-ups.

**Deliberate divergences from the original plan (owner decisions, not drift):**

* **Default stadium is now "All stadiums," not BC Place.** Chosen by the owner. The selector still leads with Vancouver (BC Place) and the venue-first design is unchanged; only the initial view differs. `DEFAULT_STADIUM_ID = "all"`. The "Default to BC Place" guiding principle below is superseded by this choice.
* **Default tab is "Today,"** so the app opens on the day's matches across all stadiums.
* **Canada-only quick filter was removed** (was added, then pulled). The stadium selector already covers following a city; the extra chip was redundant.
* **Knockout bracket view added** as its own tab, with connector lines between rounds.
* **Live-match polish:** elapsed-time / stoppage-time indicators in the hero and cards; a scored match is treated as finished when the provider status lags.
* **Team flags/marks** (`src/lib/teamMarks.ts`) and a refreshed match UI.
* **Social share card:** `public/og-card.png` + OpenGraph metadata for link previews.

These supersede the corresponding "Should Have / Nice to Have / guiding principle" lines where they conflict; the original text is kept below for history.

### Phase 1: Static App — ✅ Complete

* Scaffolded Vite + Preact + TypeScript (project config, tsconfig project refs, `.gitignore`, `index.html`).
* Added `netlify.toml` (build, functions dir, dev proxy).
* Added stadium metadata (`src/data/stadiums.ts`) and the canonical venue-normalization map + helpers (`src/lib/stadiums.ts`).
* Built the seed step (`scripts/seed.mjs`, `npm run seed`): fetches openfootball, converts `13:00 UTC-6` → ISO `kickoffUtc`, assigns `matchNumber` (group 1–72 chronological, knockout uses openfootball `num` 73–104), normalizes every venue, writes `public/data/world-cup-2026-static.json`. Verified: 104 matches, all 16 venues mapped, BC Place = 7.
* Seed and the Netlify function share one venue map — Node 23.6+ strips TS types, so `seed.mjs` imports `src/lib/stadiums.ts` directly (no duplication).
* Built app shell + components: `AppHeader`, `StadiumSelect` (BC Place default, localStorage persistence, All-stadiums option), `MatchCard` (dual local/venue time, status badges, stage/group, city + stadium), `MatchList` (grouped by date), `EmptyState`, `DataStatus`.
* Added libs: `types`, `storage`, `formatDate` (Intl-only), `matchStatus`, `matches` (filter/group/hero/today), `apiClient` (function → static fallback), `calendar` (.ics), `share`.
* Added All / Upcoming / Live / Results filters, hero card (live → next → last result), adaptive polling (30s live / 5m matchday / 30m idle).
* Verified: `npm run build` passes (≈10.4 kB gzip JS); preview serves; static JSON loads (104 matches); manifest 200.

Note: share + calendar buttons and no-spoiler toggle (Phase 3 items) were folded into the cards/app during Phase 1 since they were cheap and self-contained.

### Phase 2: Live Data Function — ✅ Complete

* Built `netlify/functions/matches.mts`: single endpoint, tries football-data.org → openfootball live mirror → static spine, returns the full envelope (`app`, `defaultStadium`, `source`, `fallbackUsed`, `lastUpdated`, `matches`).
* football-data.org adapter (`src/lib/footballData.ts`): WC competition code, maps provider statuses (IN_PLAY→live, PAUSED→halftime, FINISHED→finished, …) and stages (LAST_16→round_of_16, FINAL→final, …), normalizes venue through the canonical map, degrades to `stadiumId: "unknown"` when venue is null (the pre-launch unknown).
* openfootball adapter (`src/lib/openfootball.ts`): shared by the seed step and the live mirror (same schema), converts offset times to ISO, carries scorers.
* Merge logic (`src/lib/mergeMatches.ts`): spine is source of truth; live data only decorates (status/score/scorers/lastUpdated/providerId). Joins on FIFA `matchNumber`, backstop on stadiumId + UTC date + closest kickoff within 3h. Never takes venue from the live provider. Resolves placeholder team names ("Winner Group A") only when the live side has a real name.
* CDN cache headers adapt to state: 25s live, 300s match-day, 1800s idle — decouples client poll rate from the 10/min upstream cap.
* Tests: 21 passing across the suite (`mergeMatches` join keys, spine-as-truth, `isPlaceholderTeam`, venue-normalization map covering all 16 stadiums, football-data adapter status/venue/penalties mapping, team filter).
* Verified offline: degraded path returns 200, 104 matches, 7 BC Place, correct cache headers; openfootball mirror path merges 66 finished results with scores. API key stays server-side (`process.env`, never shipped to the browser).

### Phase 3: Usability Features — ✅ Complete

Most Phase 3 items were folded into Phase 1 (no-spoiler toggle, native share, calendar `.ics`). Confirmed the rest:

* Loading / error / empty states in `app.tsx` (initial spinner, per-filter and per-stadium empty messages).
* `DataStatus` banner matches the plan spec: "Live score temporarily unavailable. Showing schedule data." on fallback, source + last-checked line, free-data lag note.
* Responsive mobile-first CSS (`global.css`): 640px max width, safe-area insets, sticky date headings, overflow-scroll filter tabs, pulsing live badge, one breakpoint at 560px.
* PWA: `manifest.webmanifest` linked in `index.html`, standalone display, theme color, maskable icon.

Added this pass (knockout-readiness):

* Penalty shootout display — `homePens`/`awayPens` on the `Match` type, parsed from football-data.org (`score.penalties`) and openfootball (`score.p`), carried through `mergeMatches`, rendered as `(4–3 pens)` on the card (hidden in no-spoiler mode). 2 new tests.
* Hero heading polish — "Live now" / "Next up" when All stadiums is selected (was the awkward "Live at All stadiums").

### Phase 4: Optional Enhancements — 🚧 In progress

Knockout/tournament-relevant items pulled forward:

* Penalty shootout display ✅ (see Phase 3 pass).
* Canada quick filter — added, then **removed** by owner decision (commit `142c2a2`). The stadium selector already lets a user follow a city, so the chip was redundant. Its tests were removed with it.
* Knockout bracket view ✅ — dedicated tab (`BracketView.tsx`) rendering the round_of_32 → final path with connector lines between rounds.
* Team flags / marks ✅ — `src/lib/teamMarks.ts`, surfaced on cards and tabs.
* Live elapsed / stoppage-time indicators ✅, plus a "scored ⇒ finished" guard for when the provider status lags behind the score.
* Social share card ✅ — `public/og-card.png` and OpenGraph metadata for link previews.

Repo-readiness: real `README.md` (was a placeholder), `*.tsbuildinfo` added to `.gitignore`.

Suite is now **30 tests** passing (up from 21).

### Phase 1: Static App

Goal: make the app useful before any live API is added.

1. Scaffold Vite + Preact + TypeScript.
2. Add Netlify config.
3. Add stadium metadata.
4. Build the seed step that converts openfootball data into `world-cup-2026-static.json`, including ISO kickoff conversion and `matchNumber`.
5. Build the stadium selector.
6. Default stadium to BC Place.
7. Persist selected stadium in localStorage.
8. Render all matches for the selected stadium.
9. Add All, Upcoming, Live, Results filters.
10. Add match cards with stadium and city shown by default, in both local and venue time.

Exit criteria:

* App works locally.
* BC Place loads by default.
* User can select another stadium.
* Match cards show stadium and city.
* Static match list renders with no API.

### Phase 2: Live Data Function

Goal: add live score enhancement without breaking the static app.

1. Create /.netlify/functions/matches.
2. Add the football-data.org provider adapter.
3. Normalize the provider response into internal Match[].
4. Merge provider data onto the static schedule using the match-number key and venue normalization map.
5. Return all matches with the envelope (source, fallbackUsed, lastUpdated).
6. Add CDN cache headers per the polling strategy.
7. Add the openfootball live mirror as the secondary fallback.
8. Add the degraded response if every provider fails.

Exit criteria:

* API key is never exposed in the browser.
* Frontend receives normalized, merged match data.
* Static layer always renders.
* Live scores show when available.
* App still works when the provider fails.
* BC Place matches never drop out due to a venue mismatch.

### Phase 3: Usability Features

Goal: make it good on a phone.

1. Add no-spoiler mode.
2. Add native share button.
3. Add calendar file generation.
4. Add the data source and fallback banner.
5. Add loading state.
6. Add empty state.
7. Add responsive styling.
8. Add the PWA manifest.

Exit criteria:

* User can hide scores.
* User can share a match.
* User can add a match to calendar.
* App feels good on mobile.
* App installs as a PWA.

### Phase 4: Optional Enhancements

Goal: add useful features without bloat.

1. Canada quick filter. ❌ Removed by owner decision (redundant with the stadium selector).
2. Favourite team filter. (not built)
3. Group standings. (not built)
4. Scorers, if the provider supports them on free. ✅ (shown on cards when present)
5. Penalties display. ✅
6. Host city resource links. (not built)
7. Transit links. (not built)
8. Stadium policy links. (not built)
9. Fan festival links. (not built)
10. Weather link for the selected stadium city. (not built)

Added beyond the original Phase 4 list (owner choices):

11. Knockout bracket view (own tab). ✅
12. Team flags / marks. ✅
13. Live elapsed / stoppage-time indicators. ✅
14. Social share card (og-card.png + OpenGraph metadata). ✅

## Proposed Improvements

Curated from the 2026-06-30 review. Each is scored on value vs. the YAGNI cost of
adding it. The point of the list is as much about what to **skip** as what to build.

### Recommended (high value, low bloat)

1. **Group standings table.** A tournament tracker that shows group letters but no
   table is a real gap during the group stage. Computable entirely from data the app
   already has — no new API — by tallying finished-match results (points, GD, GF)
   per group. Surface it on the group/All view (e.g. a "Groups" tab or a section
   above the group fixtures). Respects "no database, free APIs only." Medium effort,
   one focused test on the points/tiebreak logic. _(Was P2, not built.)_

2. **Follow a team.** The stadium selector lets a fan follow a *city*, but a team
   plays across three group venues and then unknown knockout venues, so there's no
   way to follow *Canada* or *Argentina* across the tournament. Add a team picker
   (persisted like the stadium choice) that filters to a team's matches across all
   stadiums, resolving through knockout slots as teams advance. Low effort, high
   value for the core "what's next for my team" question. _(Was P2, not built.)_

3. **Offline last-good response.** The PWA installs but has no offline data. Persist
   the last successful function payload to `localStorage` and hydrate from it on load
   (before the network resolves), with the existing "last checked" line making the
   staleness honest. Completes the half-built offline story. Low effort. _(Was P2,
   "offline-friendly last successful response.")_

4. **Dead-export guard in CI.** The two pruned exports passed `tsc`/`noUnusedLocals`
   because those only flag unused *locals*, not unused *exports*. Add a `knip` (or
   `ts-prune`) check to `npm run` and CI so speculative code can't accumulate
   silently. Keeps the codebase honest to its own YAGNI principle. Very low effort.

### Deliberately deferred (YAGNI — skip for now)

- **Host city / transit / stadium-policy / fan-festival / weather links (P3).** Real
  content-maintenance burden (16 venues × several link types, all external and
  drifting) for low core value. The app's job is fixtures, scores, and venue — these
  dilute it. Revisit only if users ask.
- **Scorers beyond what the free tier already gives.** Already shown when present;
  don't build a dedicated scorers/lineups view — that's the "full player pages" line
  that's explicitly out of scope.
- **Favourite-team *quick chips* (à la the removed Canada chip).** The "follow a
  team" picker above covers this without re-adding per-team chips that were pulled
  once already as redundant.

## Feature Backlog

### P0

* Mobile-first app
* Netlify deployment
* worldcup.4dl.ca domain
* Stadium selector
* BC Place default
* Static match data spine
* Match cards
* Stadium field on every match
* Past, live, and upcoming states
* Free API proxy
* Live data merged onto static
* Last updated timestamp

### P1

* No-spoiler mode
* Add to calendar
* Native share
* All, Upcoming, Live, Results filters
* Today's matches
* Next match hero
* Fallback banner
* Merge and status test

### P2

* PWA install support
* Favourite team
* Canada quick filter
* Group standings
* Scorers
* Penalties
* Offline cache

### P3

* Host city links
* Stadium policy links
* Transit links
* Fan festival links
* Weather links

### Not Planned

* Login
* Database
* Paid APIs
* Betting odds
* Predictions
* Chat
* Comments
* News feed
* Admin panel
* Push notifications

## Suggested GitHub Issues

1. Scaffold Vite + Preact + TypeScript app
2. Add Netlify configuration
3. Add PLAN.md
4. Add stadium metadata and canonical stadium IDs
5. Build seed step: openfootball to static JSON, with ISO kickoff and match numbers
6. Add static World Cup 2026 match data
7. Build app shell and header
8. Build StadiumSelect
9. Default selected stadium to BC Place
10. Persist selected stadium in localStorage
11. Build MatchCard with dual-time display
12. Build match list grouped by date, filtered by selected stadium
13. Add All, Upcoming, Live, Results filters
14. Add match status helper
15. Add date and timezone formatting (local plus venue)
16. Add Netlify matches function
17. Add football-data.org provider adapter
18. Build merge logic: match-number key plus venue normalization map
19. Add merge and status tests
20. Add openfootball live mirror as secondary fallback
21. Add degraded response and envelope fields
22. Add CDN cache headers
23. Add data source and fallback banner
24. Add no-spoiler mode
25. Add share button
26. Add calendar button
27. Add PWA manifest
28. Deploy to Netlify ✅ (live)
29. Configure worldcup.4dl.ca ✅ (domain set in Cloudflare, live)
30. Verify football-data.org venue field is populated for WC matches — ⏳ open (verify against the production token)

## Risks and Caveats

Free live scores are the project's main risk. football-data.org free gives status, scores, and results for the World Cup, but it is not broadcast-grade real-time and updates can lag. Surface a clear "last updated" timestamp and a delay note rather than implying a precision the free tier cannot promise. The DataStatus banner is the right home for this.

Venue field on the free tier is unconfirmed for WC matches. Verify it is populated before launch (issue 30). If null, fall back to the static schedule for stadium, which the static-first design already supports.

The merge is fragile by nature. Knockout matches read as TBD until teams resolve, so the match-number join key and the venue normalization map are both load-bearing. The one mandatory test covers them.

Marketing-page noise is everywhere. Several "free World Cup 2026 API" results are landing pages for paid products. The two genuinely free sources this plan relies on are openfootball (public domain, no key) and football-data.org free tier (confirmed WC coverage).

## Success Criteria

The app is successful if:

* It loads quickly on mobile.
* BC Place is selected by default.
* A user can switch to any stadium.
* Every match clearly shows the stadium.
* Past, live, and future matches are easy to understand.
* Scores update when free APIs are available.
* The app still works when APIs are unavailable.
* The repo stays simple and easy to maintain.

## Working Tagline

A simple stadium-first World Cup 2026 tracker.

## Final Build Philosophy

Static-first, live-enhanced, stadium-focused.
