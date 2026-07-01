import type { Match, Stage } from "./types.ts";
import { normalizeVenue, getStadium } from "./stadiums.ts";

/**
 * Shared openfootball parsing, used by both the seed step (static spine) and
 * the secondary live fallback (the openfootball live mirror), which share the
 * same JSON schema.
 *
 * For the live mirror we only have the FIFA `num` on knockout matches, so group
 * matches come through with `matchNumber` undefined and the merge falls back to
 * the venue+date+slot backstop — which is correct.
 */

type OfGoal = { name?: string; minute?: string | number };
export type OfMatch = {
  round?: string;
  num?: number;
  date?: string;
  time?: string;
  team1?: string;
  team2?: string;
  group?: string;
  ground?: string;
  score?: { ft?: number[]; ht?: number[]; p?: number[] };
  goals1?: OfGoal[];
  goals2?: OfGoal[];
};
export type OfFile = { matches?: OfMatch[] };

function toStage(round: string | undefined): Stage {
  if (!round) return "group";
  if (round.startsWith("Matchday")) return "group";
  switch (round) {
    case "Round of 32":
      return "round_of_32";
    case "Round of 16":
      return "round_of_16";
    case "Quarter-final":
      return "quarter_final";
    case "Semi-final":
      return "semi_final";
    case "Match for third place":
      return "third_place";
    case "Final":
      return "final";
    default:
      return "group";
  }
}

function toGroup(group: string | undefined): string | undefined {
  if (!group) return undefined;
  return group.replace(/^Group\s+/i, "").trim() || undefined;
}

/** "13:00 UTC-6" + date → ISO UTC instant. */
function toKickoffUtc(date: string, time: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})(?::(\d{2}))?$/.exec(time.trim());
  if (!m) throw new Error(`Cannot parse time: "${time}"`);
  const [, hh, mm, offHrs, offMin = "00"] = m;
  const sign = offHrs.startsWith("-") ? "-" : "+";
  const offH = String(Math.abs(Number(offHrs))).padStart(2, "0");
  const iso = `${date}T${hh.padStart(2, "0")}:${mm}:00${sign}${offH}:${offMin}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date from "${iso}"`);
  return d.toISOString();
}

function scorerNames(goals: OfGoal[] | undefined): string[] {
  if (!Array.isArray(goals)) return [];
  return goals
    .map((g) => (g?.minute ? `${g.name} ${g.minute}'` : g?.name))
    .filter((x): x is string => !!x);
}

/** Convert a single openfootball match into an internal Match. */
export function convertOfMatch(m: OfMatch): Match {
  const stage = toStage(m.round);
  const kickoffUtc = toKickoffUtc(m.date ?? "", m.time ?? "00:00 UTC+0");
  const stadiumId = normalizeVenue(m.ground) ?? "unknown";
  const stadium = getStadium(stadiumId);

  const ft = m.score?.ft;
  const hasScore = Array.isArray(ft) && ft.length === 2 && ft.every((n) => typeof n === "number");
  const p = m.score?.p;
  const hasPens = Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number");

  const match: Match = {
    id: `wc2026-${m.num ?? `${m.date}-${m.team1}-${m.team2}`}`,
    matchNumber: m.num,
    stage,
    group: toGroup(m.group),
    homeTeam: m.team1 ?? "TBD",
    awayTeam: m.team2 ?? "TBD",
    status: hasScore ? "finished" : "scheduled",
    kickoffUtc,
    stadium: stadium?.name ?? m.ground ?? "",
    stadiumId,
    city: stadium?.city ?? m.ground ?? "",
    country: stadium?.country ?? "",
  };

  if (hasScore) {
    match.homeScore = ft![0];
    match.awayScore = ft![1];
    const scorers = [...scorerNames(m.goals1), ...scorerNames(m.goals2)];
    if (scorers.length) match.scorers = scorers;
  }
  if (hasPens) {
    match.homePens = p![0];
    match.awayPens = p![1];
  }

  return match;
}

/** Normalize an openfootball live-mirror file into internal Match[]. */
export function normalizeOpenfootball(data: OfFile): Match[] {
  return (data.matches ?? []).map(convertOfMatch);
}
