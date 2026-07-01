import { describe, it, expect } from "vitest";
import type { Match } from "../src/lib/types.ts";
import { computeGroupStandings } from "../src/lib/standings.ts";

function gm(overrides: Partial<Match> = {}): Match {
  return {
    id: "m",
    stage: "group",
    group: "A",
    homeTeam: "Home",
    awayTeam: "Away",
    status: "finished",
    kickoffUtc: "2026-06-13T22:00:00.000Z",
    stadium: "BC Place",
    stadiumId: "bc-place",
    city: "Vancouver",
    country: "Canada",
    ...overrides,
  };
}

describe("computeGroupStandings", () => {
  it("tallies points, W/D/L, and goals from finished matches", () => {
    const matches = [
      gm({ id: "1", homeTeam: "Canada", awayTeam: "Mexico", homeScore: 2, awayScore: 1 }),
      gm({ id: "2", homeTeam: "Mexico", awayTeam: "Canada", homeScore: 1, awayScore: 1 }),
    ];
    const [groupA] = computeGroupStandings(matches);
    const canada = groupA!.rows.find((r) => r.team === "Canada")!;
    const mexico = groupA!.rows.find((r) => r.team === "Mexico")!;

    expect(canada.played).toBe(2);
    expect(canada.won).toBe(1);
    expect(canada.drawn).toBe(1);
    expect(canada.lost).toBe(0);
    expect(canada.goalsFor).toBe(3);
    expect(canada.goalsAgainst).toBe(2);
    expect(canada.goalDifference).toBe(1);
    expect(canada.points).toBe(4);

    expect(mexico.points).toBe(1);
    expect(mexico.won).toBe(0);
    expect(mexico.lost).toBe(1);
    expect(mexico.drawn).toBe(1);
  });

  it("orders by points, then goal difference, then goals for", () => {
    // Spain and Brazil both finish on 3 points; Spain has the better GD. Chile
    // (0 pts, GD -1) still ranks above Qatar (0 pts, GD -4).
    const matches = [
      gm({ id: "1", group: "B", homeTeam: "Spain", awayTeam: "Qatar", homeScore: 4, awayScore: 0 }),
      gm({ id: "2", group: "B", homeTeam: "Brazil", awayTeam: "Chile", homeScore: 2, awayScore: 1 }),
    ];
    const [groupB] = computeGroupStandings(matches);
    expect(groupB!.rows.map((r) => r.team)).toEqual(["Spain", "Brazil", "Chile", "Qatar"]);
    expect(groupB!.rows[0]!.points).toBe(3);
    expect(groupB!.rows[1]!.points).toBe(3);
  });

  it("breaks a points+GD tie on goals for", () => {
    // X: won 3-1 (+2), Y: won 2-0 (+2). Same points, same GD; X scored more.
    const matches = [
      gm({ id: "1", group: "C", homeTeam: "X", awayTeam: "P", homeScore: 3, awayScore: 1 }),
      gm({ id: "2", group: "C", homeTeam: "Y", awayTeam: "Q", homeScore: 2, awayScore: 0 }),
    ];
    const [groupC] = computeGroupStandings(matches);
    expect(groupC!.rows.slice(0, 2).map((r) => r.team)).toEqual(["X", "Y"]);
  });

  it("lists every team in the group before any match is played", () => {
    const matches = [
      gm({ id: "1", homeTeam: "Canada", awayTeam: "Mexico", status: "scheduled", homeScore: undefined, awayScore: undefined }),
      gm({ id: "2", homeTeam: "Croatia", awayTeam: "Belgium", status: "scheduled", homeScore: undefined, awayScore: undefined }),
    ];
    const [groupA] = computeGroupStandings(matches);
    expect(groupA!.rows).toHaveLength(4);
    expect(groupA!.rows.every((r) => r.played === 0 && r.points === 0)).toBe(true);
  });

  it("counts only finished matches, ignoring in-progress scores", () => {
    const matches = [
      gm({ id: "1", homeTeam: "Canada", awayTeam: "Mexico", status: "live", homeScore: 1, awayScore: 0 }),
    ];
    const [groupA] = computeGroupStandings(matches);
    expect(groupA!.rows.every((r) => r.played === 0)).toBe(true);
  });

  it("ignores knockout matches and unresolved placeholder teams", () => {
    const matches = [
      gm({ id: "ko", stage: "round_of_32", group: undefined, homeTeam: "Canada", awayTeam: "Brazil", homeScore: 1, awayScore: 0 }),
      gm({ id: "ph", homeTeam: "Winner Group A", awayTeam: "1B", homeScore: 2, awayScore: 2 }),
    ];
    expect(computeGroupStandings(matches)).toEqual([]);
  });

  it("returns groups sorted alphabetically", () => {
    const matches = [
      gm({ id: "1", group: "C", homeTeam: "C1", awayTeam: "C2", homeScore: 1, awayScore: 0 }),
      gm({ id: "2", group: "A", homeTeam: "A1", awayTeam: "A2", homeScore: 1, awayScore: 0 }),
    ];
    expect(computeGroupStandings(matches).map((g) => g.group)).toEqual(["A", "C"]);
  });
});
