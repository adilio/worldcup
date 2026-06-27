import type { Match } from "./types.ts";
import { ALL_STADIUMS_ID } from "../data/stadiums.ts";
import { isLive, isFinished, isUpcoming } from "./matchStatus.ts";

export type FilterTab = "all" | "upcoming" | "live" | "results";

export function filterByStadium(matches: Match[], stadiumId: string): Match[] {
  if (stadiumId === ALL_STADIUMS_ID) return matches;
  return matches.filter((m) => m.stadiumId === stadiumId);
}

/** True if `team` (case-insensitive) is the home or away side in the match. */
export function isTeamPlaying(match: Match, team: string): boolean {
  const t = team.trim().toLowerCase();
  if (!t) return false;
  return (
    match.homeTeam.trim().toLowerCase() === t ||
    match.awayTeam.trim().toLowerCase() === t
  );
}

export function filterByTeam(matches: Match[], team: string): Match[] {
  if (!team) return matches;
  return matches.filter((m) => isTeamPlaying(m, team));
}

export function applyTabFilter(matches: Match[], tab: FilterTab): Match[] {
  switch (tab) {
    case "live":
      return matches.filter((m) => isLive(m.status));
    case "upcoming":
      return matches.filter((m) => isUpcoming(m.status));
    case "results":
      return matches.filter((m) => isFinished(m.status));
    case "all":
    default:
      return matches;
  }
}

export function sortByKickoff(matches: Match[], dir: "asc" | "desc" = "asc"): Match[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...matches].sort((a, b) =>
    a.kickoffUtc < b.kickoffUtc ? -sign : a.kickoffUtc > b.kickoffUtc ? sign : 0,
  );
}

/** Local-date key (YYYY-MM-DD in the user's timezone) for grouping the list. */
function localDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export type DateGroup = { dateKey: string; iso: string; matches: Match[] };

/** Group matches by user-local date, each group sorted by kickoff. */
export function groupByDate(matches: Match[]): DateGroup[] {
  const groups = new Map<string, Match[]>();
  for (const m of matches) {
    const key = localDateKey(m.kickoffUtc);
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([dateKey, ms]) => ({
      dateKey,
      iso: sortByKickoff(ms)[0]!.kickoffUtc,
      matches: sortByKickoff(ms),
    }));
}

/**
 * Pick the hero match for the selected stadium:
 *   1. a live match (soonest kickoff among live),
 *   2. else the next upcoming match,
 *   3. else the most recently finished match.
 */
export function selectHeroMatch(matches: Match[], now: Date = new Date()): Match | undefined {
  const live = sortByKickoff(matches.filter((m) => isLive(m.status)));
  if (live.length) return live[0];

  const nowMs = now.getTime();
  const upcoming = sortByKickoff(
    matches.filter((m) => isUpcoming(m.status) && new Date(m.kickoffUtc).getTime() >= nowMs),
  );
  if (upcoming.length) return upcoming[0];

  const finished = sortByKickoff(matches.filter((m) => isFinished(m.status)), "desc");
  if (finished.length) return finished[0];

  // Nothing live/upcoming/finished — fall back to whatever exists, soonest first.
  return sortByKickoff(matches)[0];
}

export function todaysMatches(matches: Match[], now: Date = new Date()): Match[] {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return sortByKickoff(matches.filter((m) => localDateKey(m.kickoffUtc) === todayKey));
}
