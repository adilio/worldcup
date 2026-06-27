import type { Match, MatchStatus, Stage } from "./types.ts";
import { normalizeVenue, getStadium } from "./stadiums.ts";

/**
 * Adapter for football-data.org v4 (competition code WC, free tier).
 *
 * Important: football-data.org does not expose the FIFA match number, so the
 * normalized matches usually have `matchNumber` undefined and the merge relies
 * on the venue+date+slot backstop. That is why we map the provider's venue
 * string through the canonical normalization here — if `venue` is populated for
 * WC matches (the one pre-launch unknown, issue 30), the backstop works; if it
 * is null, the static schedule still carries stadium and the app degrades
 * gracefully.
 */

type FdTeam = { id?: number; name?: string; shortName?: string; tla?: string };
type FdScore = {
  fullTime?: { home?: number | null; away?: number | null };
  halfTime?: { home?: number | null; away?: number | null };
  penalties?: { home?: number | null; away?: number | null };
};
type FdMatch = {
  id?: number;
  utcDate?: string;
  status?: string;
  stage?: string;
  group?: string | null;
  matchday?: number | null;
  homeTeam?: FdTeam;
  awayTeam?: FdTeam;
  score?: FdScore;
  venue?: string | null;
  lastUpdated?: string;
};
export type FdResponse = { matches?: FdMatch[] };

function mapStatus(s: string | undefined): MatchStatus {
  switch (s) {
    case "SCHEDULED":
    case "TIMED":
      return "scheduled";
    case "IN_PLAY":
    case "LIVE":
      return "live";
    case "PAUSED":
      return "halftime";
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "POSTPONED":
    case "SUSPENDED":
      return "postponed";
    case "CANCELLED":
    case "CANCELED":
      return "cancelled";
    default:
      return "unknown";
  }
}

function mapStage(s: string | undefined): Stage {
  switch (s) {
    case "LAST_32":
    case "ROUND_OF_32":
      return "round_of_32";
    case "LAST_16":
    case "ROUND_OF_16":
      return "round_of_16";
    case "QUARTER_FINALS":
      return "quarter_final";
    case "SEMI_FINALS":
      return "semi_final";
    case "THIRD_PLACE":
      return "third_place";
    case "FINAL":
      return "final";
    case "GROUP_STAGE":
    default:
      return "group";
  }
}

function mapGroup(g: string | null | undefined): string | undefined {
  if (!g) return undefined;
  return g.replace(/^GROUP[_\s]*/i, "").trim() || undefined;
}

function num(n: number | null | undefined): number | undefined {
  return typeof n === "number" ? n : undefined;
}

/** Normalize a football-data.org response into internal Match[]. */
export function normalizeFootballData(data: FdResponse): Match[] {
  const matches = data.matches ?? [];
  return matches.map((m): Match => {
    const stadiumId = normalizeVenue(m.venue) ?? "unknown";
    const stadium = getStadium(stadiumId);
    const home = m.homeTeam?.name ?? m.homeTeam?.shortName ?? "TBD";
    const away = m.awayTeam?.name ?? m.awayTeam?.shortName ?? "TBD";

    return {
      id: m.id ? `fd-${m.id}` : `fd-${home}-${away}-${m.utcDate ?? ""}`,
      providerId: m.id != null ? String(m.id) : undefined,
      stage: mapStage(m.stage),
      group: mapGroup(m.group),
      homeTeam: home,
      awayTeam: away,
      homeScore: num(m.score?.fullTime?.home),
      awayScore: num(m.score?.fullTime?.away),
      homePens: num(m.score?.penalties?.home),
      awayPens: num(m.score?.penalties?.away),
      status: mapStatus(m.status),
      kickoffUtc: m.utcDate ?? "",
      stadium: stadium?.name ?? m.venue ?? "",
      stadiumId,
      city: stadium?.city ?? "",
      country: stadium?.country ?? "",
      lastUpdated: m.lastUpdated,
    };
  });
}
