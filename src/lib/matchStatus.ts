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
