import staticData from "../../public/data/world-cup-2026-static.json" with { type: "json" };
import type { Match, MatchesResponse } from "../../src/lib/types.ts";
import { mergeMatches, resolveKnockoutTeams, isPlaceholderTeam } from "../../src/lib/mergeMatches.ts";
import { normalizeFootballData, type FdResponse } from "../../src/lib/footballData.ts";
import { normalizeOpenfootball, type OfFile } from "../../src/lib/openfootball.ts";
import { isLive } from "../../src/lib/matchStatus.ts";

const APP_NAME = "4dl World Cup 2026";
const DEFAULT_STADIUM = "BC Place";

const FD_BASE = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4";
const FD_TOKEN = process.env.FOOTBALL_DATA_API_TOKEN ?? "";
const OF_LIVE_URL =
  process.env.OPENFOOTBALL_LIVE_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const RAW_SPINE: Match[] = (staticData as { matches: Match[] }).matches;

// Preserve the original W{N}/L{N} bracket slot codes on each knockout match so that
// even after live data resolves team names (e.g. "W73" → "Canada") the BracketView
// can still reconstruct the correct visual bracket ordering.
const SPINE: Match[] = RAW_SPINE.map((m) => {
  if (m.stage === "group") return m;
  const homeSlot = isPlaceholderTeam(m.homeTeam) ? m.homeTeam : undefined;
  const awaySlot = isPlaceholderTeam(m.awayTeam) ? m.awayTeam : undefined;
  return homeSlot || awaySlot ? { ...m, homeSlot, awaySlot } : m;
});

type LiveResult = { matches: Match[]; source: string } | null;

/** Layer 2: football-data.org free tier. Returns null on any failure. */
async function tryFootballData(): Promise<LiveResult> {
  if (!FD_TOKEN) return null;
  try {
    const res = await fetch(`${FD_BASE}/competitions/WC/matches`, {
      headers: { "X-Auth-Token": FD_TOKEN },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as FdResponse;
    const matches = normalizeFootballData(data);
    if (!matches.length) return null;
    return { matches, source: "football-data.org" };
  } catch {
    return null;
  }
}

/** Layer 3: openfootball live mirror (same schema as the static seed). */
async function tryOpenfootballMirror(): Promise<LiveResult> {
  try {
    const res = await fetch(OF_LIVE_URL, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as OfFile;
    const matches = normalizeOpenfootball(data);
    if (!matches.length) return null;
    return { matches, source: "openfootball live mirror" };
  } catch {
    return null;
  }
}

/** Cache windows (seconds) per the polling strategy. */
function cacheSeconds(matches: Match[]): number {
  const now = Date.now();
  const todayKey = new Date(now).toISOString().slice(0, 10);
  if (matches.some((m) => isLive(m.status))) return 25;
  const hasToday = matches.some((m) => m.kickoffUtc.slice(0, 10) === todayKey);
  return hasToday ? 300 : 1800;
}

export default async function handler(): Promise<Response> {
  // Layer 1 is always present (bundled). Decorate with the best live source.
  let live = await tryFootballData();
  if (!live) live = await tryOpenfootballMirror();

  const merged = live
    ? mergeMatches(SPINE, live.matches)
    : resolveKnockoutTeams(SPINE.map((m) => ({ ...m })));
  const source = live ? live.source : "static schedule";
  // Primary live source is football-data.org; anything else is a fallback path.
  const fallbackUsed = source !== "football-data.org";

  const body: MatchesResponse = {
    app: APP_NAME,
    defaultStadium: DEFAULT_STADIUM,
    source,
    fallbackUsed,
    lastUpdated: new Date().toISOString(),
    matches: merged,
  };

  const maxAge = cacheSeconds(merged);
  const hasLive = merged.some((m) => isLive(m.status));
  // stale-while-revalidate: keep low during live matches so the CDN doesn't
  // serve stale scores for an extra 60s on top of the s-maxage window.
  // For non-live states the higher value is fine (freshness matters less).
  const swr = hasLive ? 10 : 60;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Decouple the client poll rate from the upstream rate limit: the CDN
      // serves cached responses, keeping upstream calls well under 10/min.
      "cache-control": "public, no-cache",
      "netlify-cdn-cache-control": `public, durable, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
    },
  });
}
