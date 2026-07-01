import type { Match } from "./types.ts";
import { isPlaceholderTeam } from "./mergeMatches.ts";

/** One team's row in a group table. */
type StandingRow = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type GroupStanding = { group: string; rows: StandingRow[] };

function emptyRow(team: string): StandingRow {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

/** True once a group match has a usable final result to tally. */
function isCounted(m: Match): boolean {
  return (
    m.status === "finished" &&
    typeof m.homeScore === "number" &&
    typeof m.awayScore === "number"
  );
}

/**
 * Ranking within a group. FIFA's full 2026 tiebreak chain (head-to-head, fair
 * play, drawing of lots) is intentionally omitted — those only separate teams
 * already level on the three that matter and rarely change the picture. We use
 * the overall criteria the app can compute from its own data:
 *   points → goal difference → goals for → team name (stable, deterministic).
 */
function compareRows(a: StandingRow, b: StandingRow): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
  return a.team.localeCompare(b.team);
}

/**
 * Compute group-stage standings from the match list. Every real team named in a
 * group appears in its table (even before kickoff), and only finished matches
 * contribute to points and goals — so the table fills in live as results land.
 */
export function computeGroupStandings(matches: Match[]): GroupStanding[] {
  const groups = new Map<string, Map<string, StandingRow>>();

  const rowFor = (group: string, team: string): StandingRow => {
    let table = groups.get(group);
    if (!table) {
      table = new Map();
      groups.set(group, table);
    }
    let row = table.get(team);
    if (!row) {
      row = emptyRow(team);
      table.set(team, row);
    }
    return row;
  };

  for (const m of matches) {
    if (m.stage !== "group" || !m.group) continue;
    if (isPlaceholderTeam(m.homeTeam) || isPlaceholderTeam(m.awayTeam)) continue;

    // Register both teams so the full group shows before any match is played.
    const home = rowFor(m.group, m.homeTeam);
    const away = rowFor(m.group, m.awayTeam);
    if (!isCounted(m)) continue;

    const hs = m.homeScore as number;
    const as = m.awayScore as number;

    home.played++;
    away.played++;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;

    if (hs > as) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (hs < as) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, table]) => {
      const rows = [...table.values()];
      for (const r of rows) r.goalDifference = r.goalsFor - r.goalsAgainst;
      rows.sort(compareRows);
      return { group, rows };
    });
}
