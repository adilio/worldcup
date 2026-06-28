import type { Match, MatchStatus, Stage } from "./types.ts";

export function isLive(status: MatchStatus): boolean {
  return status === "live" || status === "halftime";
}

export function isFinished(status: MatchStatus): boolean {
  return status === "finished";
}

export function isUpcoming(status: MatchStatus): boolean {
  return status === "scheduled" || status === "postponed";
}

/** Short human label for a status badge. */
export function statusLabel(m: Match): string {
  switch (m.status) {
    case "live":
      return "Live";
    case "halftime":
      return "Halftime";
    case "finished":
      return "Full time";
    case "postponed":
      return "Postponed";
    case "cancelled":
      return "Cancelled";
    case "scheduled":
      return "Scheduled";
    default:
      return "—";
  }
}

/**
 * Estimated live clock. football-data.org exposes status and score, but not an
 * official elapsed minute, so this derives a conservative display from kickoff.
 */
export type ElapsedClock = { label: string; description: string };

export function elapsedClock(m: Match, now: Date = new Date()): ElapsedClock | undefined {
  if (m.status === "halftime") {
    return { label: "HT", description: "Halftime" };
  }
  if (m.status !== "live") return undefined;

  const kickoffMs = new Date(m.kickoffUtc).getTime();
  if (Number.isNaN(kickoffMs)) return undefined;

  const elapsed = Math.max(0, Math.floor((now.getTime() - kickoffMs) / 60_000));
  if (elapsed < 45) {
    const minute = elapsed + 1;
    return { label: `${minute}'`, description: `Estimated ${minute}th minute` };
  }
  if (elapsed < 60) {
    return { label: "45+ min", description: "Estimated first-half stoppage time" };
  }
  if (elapsed < 105) {
    const minute = Math.min(90, elapsed - 14);
    return { label: `${minute}'`, description: `Estimated ${minute}th minute` };
  }
  return { label: "90+ min", description: "Estimated second-half stoppage time" };
}

export function elapsedLabel(m: Match, now: Date = new Date()): string | undefined {
  return elapsedClock(m, now)?.label;
}

const STAGE_LABELS: Record<Stage, string> = {
  group: "Group",
  round_of_32: "Round of 32",
  round_of_16: "Round of 16",
  quarter_final: "Quarter-final",
  semi_final: "Semi-final",
  third_place: "Third place",
  final: "Final",
};

/** "Group A" for group matches, otherwise the round name. */
export function stageLabel(m: Match): string {
  if (m.stage === "group") return m.group ? `Group ${m.group}` : "Group stage";
  return STAGE_LABELS[m.stage];
}

export function hasScore(m: Match): boolean {
  return typeof m.homeScore === "number" && typeof m.awayScore === "number";
}

/** True when the match was decided by a penalty shootout. */
export function hasPens(m: Match): boolean {
  return typeof m.homePens === "number" && typeof m.awayPens === "number";
}
