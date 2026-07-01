import { describe, it, expect } from "vitest";
import type { Match } from "../src/lib/types.ts";
import { filterByTeam, teamsInMatches, ALL_TEAMS_ID } from "../src/lib/matches.ts";

function m(overrides: Partial<Match> = {}): Match {
  return {
    id: "m",
    stage: "group",
    group: "A",
    homeTeam: "Canada",
    awayTeam: "Croatia",
    status: "scheduled",
    kickoffUtc: "2026-06-13T22:00:00.000Z",
    stadium: "BC Place",
    stadiumId: "bc-place",
    city: "Vancouver",
    country: "Canada",
    ...overrides,
  };
}

describe("filterByTeam", () => {
  it("returns matches where the team plays home or away", () => {
    const matches = [
      m({ id: "1", homeTeam: "Canada", awayTeam: "Mexico" }),
      m({ id: "2", homeTeam: "Brazil", awayTeam: "Canada" }),
      m({ id: "3", homeTeam: "Spain", awayTeam: "Germany" }),
    ];
    expect(filterByTeam(matches, "Canada").map((x) => x.id)).toEqual(["1", "2"]);
  });

  it("matches across provider spelling variants", () => {
    const matches = [
      m({ id: "1", homeTeam: "DR Congo", awayTeam: "Uzbekistan" }),
      m({ id: "2", homeTeam: "Norway", awayTeam: "Congo DR" }),
    ];
    // Followed value uses one spelling; both matches still resolve to it.
    expect(filterByTeam(matches, "DR Congo").map((x) => x.id)).toEqual(["1", "2"]);
  });

  it("follows a team into a resolved knockout match across stadiums", () => {
    const matches = [
      m({ id: "grp", stadiumId: "bc-place", homeTeam: "Canada", awayTeam: "Mexico" }),
      m({
        id: "ko",
        stage: "round_of_32",
        group: undefined,
        stadiumId: "lumen",
        city: "Seattle",
        homeTeam: "Canada", // resolved from a "W73" slot after the group stage
        awayTeam: "Portugal",
        homeSlot: "W73",
      }),
    ];
    expect(filterByTeam(matches, "Canada").map((x) => x.id)).toEqual(["grp", "ko"]);
  });

  it("returns everything for the All teams sentinel", () => {
    const matches = [m({ id: "1" }), m({ id: "2", homeTeam: "Spain" })];
    expect(filterByTeam(matches, ALL_TEAMS_ID)).toHaveLength(2);
  });
});

describe("teamsInMatches", () => {
  it("lists group-stage teams once, sorted, ignoring placeholders and knockout", () => {
    const matches = [
      m({ id: "1", homeTeam: "Mexico", awayTeam: "Canada" }),
      m({ id: "2", homeTeam: "Canada", awayTeam: "Croatia" }),
      m({ id: "ko", stage: "round_of_32", group: undefined, homeTeam: "1A", awayTeam: "2B" }),
    ];
    expect(teamsInMatches(matches)).toEqual(["Canada", "Croatia", "Mexico"]);
  });

  it("de-duplicates provider spelling variants", () => {
    const matches = [
      m({ id: "1", homeTeam: "DR Congo", awayTeam: "Norway" }),
      m({ id: "2", homeTeam: "Congo DR", awayTeam: "Norway" }),
    ];
    // "DR Congo"/"Congo DR" collapse to one entry (first spelling seen wins).
    expect(teamsInMatches(matches)).toEqual(["DR Congo", "Norway"]);
  });
});
