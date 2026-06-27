import type { Match, MatchStatus } from "./types.ts";

/**
 * Merge live provider data onto the static schedule spine.
 *
 * This is the most fragile code in the project, so the rules are explicit:
 *
 *  - The static schedule is the source of truth for fixtures, venue, stage,
 *    group, and kickoff. Live data only DECORATES it (status, score, scorers).
 *  - Join on FIFA `matchNumber`, which both openfootball and football-data.org
 *    expose. Do NOT join on team names — knockout matches read as TBD until
 *    teams resolve, so name joins break for the round of 32 and beyond.
 *  - Backstop join: same canonical `stadiumId` + same UTC date + closest
 *    kickoff slot, used only when a match number is missing on one side.
 *  - Venue is NEVER taken from the live provider. A silent venue mismatch would
 *    drop BC Place matches from the default view — the one failure we forbid.
 *  - Team names are only overwritten when the static value is a placeholder
 *    (e.g. "Winner Group A", "1A", "TBD") and the live provider has resolved
 *    the real team.
 */

const SLOT_TOLERANCE_MS = 3 * 60 * 60 * 1000; // 3h window for the backstop join

function utcDateKey(iso: string): string {
  return iso.slice(0, 10); // ISO is already UTC (…Z); first 10 chars = YYYY-MM-DD
}

/** True if a static team string is an unresolved placeholder, not a real team. */
export function isPlaceholderTeam(name: string | undefined): boolean {
  if (!name) return true;
  const n = name.trim();
  if (!n) return true;
  if (/^(winner|runner|loser|tbd|tba)/i.test(n)) return true;
  if (/\b(group|match)\b/i.test(n)) return true;
  // Slot codes like "1A", "2B", "W73", "RU-C".
  if (/^[wlru]*-?\d*[a-l]$/i.test(n)) return true;
  if (/^[wl]\d{1,3}$/i.test(n)) return true;
  return false;
}

type Indexed = { match: Match; index: number };

function buildLiveIndex(live: Match[]) {
  const byNumber = new Map<number, Match>();
  const byVenueDate = new Map<string, Indexed[]>();
  live.forEach((m, index) => {
    if (typeof m.matchNumber === "number") byNumber.set(m.matchNumber, m);
    if (m.stadiumId && m.stadiumId !== "unknown") {
      const key = `${m.stadiumId}|${utcDateKey(m.kickoffUtc)}`;
      const arr = byVenueDate.get(key);
      if (arr) arr.push({ match: m, index });
      else byVenueDate.set(key, [{ match: m, index }]);
    }
  });
  return { byNumber, byVenueDate };
}

function findLiveMatch(
  staticMatch: Match,
  index: ReturnType<typeof buildLiveIndex>,
): Match | undefined {
  // 1. Primary join: FIFA match number.
  if (typeof staticMatch.matchNumber === "number") {
    const hit = index.byNumber.get(staticMatch.matchNumber);
    if (hit) return hit;
  }

  // 2. Backstop: same stadium + same UTC date + closest kickoff within tolerance.
  const key = `${staticMatch.stadiumId}|${utcDateKey(staticMatch.kickoffUtc)}`;
  const candidates = index.byVenueDate.get(key);
  if (!candidates || candidates.length === 0) return undefined;

  const target = new Date(staticMatch.kickoffUtc).getTime();
  let best: Match | undefined;
  let bestDelta = Infinity;
  for (const { match } of candidates) {
    const delta = Math.abs(new Date(match.kickoffUtc).getTime() - target);
    if (delta < bestDelta && delta <= SLOT_TOLERANCE_MS) {
      best = match;
      bestDelta = delta;
    }
  }
  return best;
}

const REAL_STATUSES: ReadonlySet<MatchStatus> = new Set<MatchStatus>([
  "scheduled",
  "live",
  "halftime",
  "finished",
  "postponed",
  "cancelled",
]);

/** Merge one live match's live-only fields onto a static match. */
function decorate(staticMatch: Match, live: Match): Match {
  const merged: Match = { ...staticMatch };

  if (live.status && REAL_STATUSES.has(live.status)) {
    merged.status = live.status;
  }
  if (typeof live.homeScore === "number") merged.homeScore = live.homeScore;
  if (typeof live.awayScore === "number") merged.awayScore = live.awayScore;
  if (typeof live.homePens === "number") merged.homePens = live.homePens;
  if (typeof live.awayPens === "number") merged.awayPens = live.awayPens;
  if (live.scorers && live.scorers.length) merged.scorers = live.scorers;
  if (live.providerId) merged.providerId = live.providerId;
  if (live.lastUpdated) merged.lastUpdated = live.lastUpdated;

  // Resolve placeholder team names from the live provider, but never replace a
  // real static name with a live placeholder.
  if (isPlaceholderTeam(staticMatch.homeTeam) && !isPlaceholderTeam(live.homeTeam)) {
    merged.homeTeam = live.homeTeam;
  }
  if (isPlaceholderTeam(staticMatch.awayTeam) && !isPlaceholderTeam(live.awayTeam)) {
    merged.awayTeam = live.awayTeam;
  }

  return merged;
}

export function mergeMatches(staticMatches: Match[], liveMatches: Match[]): Match[] {
  if (!liveMatches.length) return staticMatches.map((m) => ({ ...m }));
  const index = buildLiveIndex(liveMatches);
  return staticMatches.map((m) => {
    const live = findLiveMatch(m, index);
    return live ? decorate(m, live) : { ...m };
  });
}
