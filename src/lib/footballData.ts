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
type FdHalf = { home?: number | null; away?: number | null };
type FdScore = {
  duration?: string;
  fullTime?: FdHalf;
  halfTime?: FdHalf;
  regularTime?: FdHalf;
  extraTime?: FdHalf;
  penalties?: FdHalf;
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
    // For penalty shootout matches, football-data.org puts the cumulative total
    // (regulation + ET + penalty goals) in fullTime, but its penalties field
    // contains the number of kicks attempted (equal for both sides, so useless
    // for determining the winner). Derive the correct values instead:
    //   homeScore = regularTime + extraTime  (score at end of 120 min)
    //   homePens  = fullTime - homeScore     (actual penalty goals scored)
    const isPenaltyShootout = m.score?.duration === "PENALTY_SHOOTOUT";
    const regH = num(m.score?.regularTime?.home);
    const regA = num(m.score?.regularTime?.away);
    const etH = num(m.score?.extraTime?.home) ?? 0;
    const etA = num(m.score?.extraTime?.away) ?? 0;
    const ftH = num(m.score?.fullTime?.home);
    const ftA = num(m.score?.fullTime?.away);

    let homeScore: number | undefined;
    let awayScore: number | undefined;
    let homePens: number | undefined;
    let awayPens: number | undefined;

    if (isPenaltyShootout && regH !== undefined && regA !== undefined && ftH !== undefined && ftA !== undefined) {
      homeScore = regH + etH;
      awayScore = regA + etA;
      homePens = ftH - homeScore;
      awayPens = ftA - awayScore;
    } else {
      homeScore = ftH;
      awayScore = ftA;
      homePens = num(m.score?.penalties?.home);
      awayPens = num(m.score?.penalties?.away);
    }

    const providerStatus = mapStatus(m.status);
    // football-data.org sometimes publishes the full-time score before it flips
    // the status off SCHEDULED/TIMED. A full-time score is definitive for a match
    // the provider still considers not-started; leave in-progress/live statuses be.
    const hasFullTime = homeScore !== undefined && awayScore !== undefined;
    const status: MatchStatus =
      hasFullTime && (providerStatus === "scheduled" || providerStatus === "unknown")
        ? "finished"
        : providerStatus;

    return {
      id: m.id ? `fd-${m.id}` : `fd-${home}-${away}-${m.utcDate ?? ""}`,
      providerId: m.id != null ? String(m.id) : undefined,
      stage: mapStage(m.stage),
      group: mapGroup(m.group),
      homeTeam: home,
      awayTeam: away,
      homeScore,
      awayScore,
      homePens,
      awayPens,
      status,
      kickoffUtc: m.utcDate ?? "",
      stadium: stadium?.name ?? m.venue ?? "",
      stadiumId,
      city: stadium?.city ?? "",
      country: stadium?.country ?? "",
      lastUpdated: m.lastUpdated,
    };
  });
}
