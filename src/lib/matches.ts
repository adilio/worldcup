import type { Match } from "./types.ts";
import { ALL_STADIUMS_ID } from "../data/stadiums.ts";
import { isLive, isFinished, isUpcoming } from "./matchStatus.ts";

export type FilterTab = "all" | "today" | "bracket" | "upcoming" | "results";

export function filterByStadium(matches: Match[], stadiumId: string): Match[] {
  if (stadiumId === ALL_STADIUMS_ID) return matches;
  return matches.filter((m) => m.stadiumId === stadiumId);
}

export function applyTabFilter(matches: Match[], tab: FilterTab): Match[] {
  switch (tab) {
    case "today":
      return todaysMatches(matches);
    case "bracket":
      return matches.filter((m) => m.stage !== "group");
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

export function sortLiveFirst(matches: Match[], dir: "asc" | "desc" = "asc"): Match[] {
  const sorted = sortByKickoff(matches, dir);
  return sorted.sort((a, b) => Number(isLive(b.status)) - Number(isLive(a.status)));
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
export function groupByDate(
  matches: Match[],
  dir: "asc" | "desc" = "asc",
  liveFirst = false,
): DateGroup[] {
  const sign = dir === "asc" ? 1 : -1;
  const groups = new Map<string, Match[]>();
  for (const m of matches) {
    const key = localDateKey(m.kickoffUtc);
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -sign : a[0] > b[0] ? sign : 0))
    .map(([dateKey, ms]) => ({
      dateKey,
      iso: sortByKickoff(ms, dir)[0]!.kickoffUtc,
      matches: liveFirst ? sortLiveFirst(ms, dir) : sortByKickoff(ms, dir),
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
