import { describe, it, expect, vi } from "vitest";
import type { Match } from "../src/lib/types.ts";
import { mergeMatches, isPlaceholderTeam } from "../src/lib/mergeMatches.ts";
import { normalizeVenue, STADIUMS } from "../src/lib/stadiums.ts";
import { normalizeFootballData } from "../src/lib/footballData.ts";
import {
  applyTabFilter,
  groupByDate,
  sortLiveFirst,
} from "../src/lib/matches.ts";
import { elapsedClock, elapsedLabel } from "../src/lib/matchStatus.ts";

function m(overrides: Partial<Match> = {}): Match {
  return {
    id: "wc2026-1",
    matchNumber: 1,
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

describe("mergeMatches — join keys", () => {
  it("merges live score and status onto the spine by matchNumber", () => {
    const spine = [m({ matchNumber: 73, stage: "round_of_32", homeTeam: "Canada", awayTeam: "Mexico" })];
    const live = [m({ matchNumber: 73, status: "live", homeScore: 1, awayScore: 0, providerId: "999" })];
    const [out] = mergeMatches(spine, live);
    expect(out.status).toBe("live");
    expect(out.homeScore).toBe(1);
    expect(out.awayScore).toBe(0);
    expect(out.providerId).toBe("999");
  });

  it("falls back to venue+date+slot when matchNumber is missing on the live side", () => {
    // Group matches: live providers don't expose a FIFA number, so the backstop
    // must join on stadiumId + UTC date + closest kickoff.
    const spine = [m({ matchNumber: 5, kickoffUtc: "2026-06-13T22:00:00.000Z" })];
    const live = [
      m({
        matchNumber: undefined,
        status: "finished",
        homeScore: 2,
        awayScore: 1,
        kickoffUtc: "2026-06-13T22:05:00.000Z", // slightly off, same slot
      }),
    ];
    const [out] = mergeMatches(spine, live);
    expect(out.status).toBe("finished");
    expect(out.homeScore).toBe(2);
  });

  it("does NOT join when the venue differs, even on the same date", () => {
    const spine = [m({ matchNumber: 5, stadiumId: "bc-place" })];
    const live = [m({ matchNumber: undefined, stadiumId: "lumen", status: "finished", homeScore: 9 })];
    const [out] = mergeMatches(spine, live);
    expect(out.status).toBe("scheduled");
    expect(out.homeScore).toBeUndefined();
  });

  it("does NOT join when kickoff is outside the slot tolerance", () => {
    const spine = [m({ matchNumber: 5, kickoffUtc: "2026-06-13T18:00:00.000Z" })];
    const live = [
      m({ matchNumber: undefined, kickoffUtc: "2026-06-13T23:30:00.000Z", status: "finished", homeScore: 3 }),
    ];
    const [out] = mergeMatches(spine, live);
    expect(out.status).toBe("scheduled");
  });

  it("joins by kickoff and real team names when the live provider has no venue", () => {
    const spine = [
      m({
        id: "static-70",
        matchNumber: 70,
        kickoffUtc: "2026-06-27T23:30:00.000Z",
        homeTeam: "DR Congo",
        awayTeam: "Uzbekistan",
      }),
    ];
    const live = [
      m({
        id: "live-70",
        matchNumber: undefined,
        providerId: "537408",
        stadiumId: "unknown",
        stadium: "",
        city: "",
        kickoffUtc: "2026-06-27T23:30:00.000Z",
        homeTeam: "Congo DR",
        awayTeam: "Uzbekistan",
        status: "live",
        homeScore: 0,
        awayScore: 1,
      }),
    ];

    const [out] = mergeMatches(spine, live);

    expect(out.status).toBe("live");
    expect(out.homeScore).toBe(0);
    expect(out.awayScore).toBe(1);
    expect(out.providerId).toBe("537408");
  });

  it("resolves live data onto placeholder-team knockout matches by exact kickoff when no venue or match number", () => {
    // football-data.org omits FIFA match numbers and sometimes venue for WC
    // knockout rounds. The static spine has placeholder team names ("1A", "2B")
    // until teams are resolved. All three primary joins fail; the exact-kickoff
    // fallback (join 4) should still merge the score and resolve the team names.
    const spine = [
      m({
        id: "static-ko",
        matchNumber: 90,
        stage: "round_of_32",
        kickoffUtc: "2026-07-03T23:30:00.000Z",
        homeTeam: "1A",
        awayTeam: "2B",
      }),
    ];
    const live = [
      m({
        id: "live-ko",
        matchNumber: undefined,
        stadiumId: "unknown",
        kickoffUtc: "2026-07-03T23:30:00.000Z",
        homeTeam: "Canada",
        awayTeam: "Brazil",
        status: "finished",
        homeScore: 2,
        awayScore: 1,
      }),
    ];

    const [out] = mergeMatches(spine, live);

    expect(out.status).toBe("finished");
    expect(out.homeScore).toBe(2);
    expect(out.awayScore).toBe(1);
    // Team names should be resolved from the live provider.
    expect(out.homeTeam).toBe("Canada");
    expect(out.awayTeam).toBe("Brazil");
    // Venue must still come from the static spine.
    expect(out.stadiumId).toBe("bc-place");
  });

  it("does not apply the kickoff fallback when static teams are real names", () => {
    // The kickoff fallback is only for placeholder teams; real-name static
    // matches must still go through the venue+date or team-slot paths.
    const spine = [
      m({
        id: "static-real",
        matchNumber: undefined,
        stadiumId: "lumen",
        kickoffUtc: "2026-07-03T23:30:00.000Z",
        homeTeam: "Argentina",
        awayTeam: "Germany",
      }),
    ];
    const live = [
      m({
        id: "live-different",
        matchNumber: undefined,
        stadiumId: "unknown",
        kickoffUtc: "2026-07-03T23:30:00.000Z",
        homeTeam: "Canada",
        awayTeam: "Brazil",
        status: "finished",
        homeScore: 3,
        awayScore: 0,
      }),
    ];

    const [out] = mergeMatches(spine, live);

    // Should not match — real-name static match has a different venue; the
    // kickoff fallback is gated on placeholder teams.
    expect(out.status).toBe("scheduled");
    expect(out.homeScore).toBeUndefined();
  });
});

describe("mergeMatches — spine is the source of truth", () => {
  it("never overwrites venue/stadium from the live provider", () => {
    const spine = [m({ stadium: "BC Place", stadiumId: "bc-place", city: "Vancouver" })];
    const live = [m({ stadium: "WRONG", stadiumId: "lumen", city: "Seattle", status: "live" })];
    const [out] = mergeMatches(spine, live);
    expect(out.stadiumId).toBe("bc-place");
    expect(out.stadium).toBe("BC Place");
    expect(out.city).toBe("Vancouver");
  });

  it("keeps BC Place matches in the result even with no live data", () => {
    const spine = [m({ stadiumId: "bc-place" }), m({ id: "x", matchNumber: 2, stadiumId: "lumen" })];
    const out = mergeMatches(spine, []);
    expect(out).toHaveLength(2);
    expect(out.find((x) => x.stadiumId === "bc-place")).toBeTruthy();
  });

  it("resolves a placeholder team name from live, but never the reverse", () => {
    const spine = [
      m({ matchNumber: 73, stage: "round_of_32", homeTeam: "Winner Group A", awayTeam: "Canada" }),
    ];
    const live = [m({ matchNumber: 73, homeTeam: "Brazil", awayTeam: "TBD", status: "scheduled" })];
    const [out] = mergeMatches(spine, live);
    expect(out.homeTeam).toBe("Brazil"); // placeholder resolved
    expect(out.awayTeam).toBe("Canada"); // real name not clobbered by live placeholder
  });

  it("returns a copy and does not mutate the spine", () => {
    const spine = [m({ matchNumber: 73 })];
    const live = [m({ matchNumber: 73, status: "live", homeScore: 1, awayScore: 1 })];
    mergeMatches(spine, live);
    expect(spine[0]!.status).toBe("scheduled");
    expect(spine[0]!.homeScore).toBeUndefined();
  });

  it("carries a penalty shootout result through from the live provider", () => {
    const spine = [m({ matchNumber: 100, stage: "round_of_16", homeTeam: "Canada", awayTeam: "Brazil" })];
    const live = [
      m({ matchNumber: 100, status: "finished", homeScore: 1, awayScore: 1, homePens: 4, awayPens: 3 }),
    ];
    const [out] = mergeMatches(spine, live);
    expect(out.homeScore).toBe(1);
    expect(out.awayScore).toBe(1);
    expect(out.homePens).toBe(4);
    expect(out.awayPens).toBe(3);
  });
});

describe("isPlaceholderTeam", () => {
  it("flags unresolved placeholders", () => {
    for (const p of [
      "Winner Group A", "Runner-up B", "1A", "2C", "W73", "TBD", "Loser 101", "", undefined,
      // Best-third-place slot codes used by openfootball for the 2026 R32 draw
      "3A/B/C/D/F", "3C/D/F/G/H", "3C/E/F/H/I", "3E/H/I/J/K", "3B/E/F/I/J",
    ]) {
      expect(isPlaceholderTeam(p)).toBe(true);
    }
  });
  it("accepts real team names", () => {
    for (const t of ["Canada", "Mexico", "South Africa", "Côte d'Ivoire", "United States"]) {
      expect(isPlaceholderTeam(t)).toBe(false);
    }
  });
});

describe("match list filters and ordering", () => {
  it("groups dates and matches newest-first when requested", () => {
    const matches = [
      m({ id: "old-late", kickoffUtc: "2026-06-13T22:00:00.000Z" }),
      m({ id: "new", kickoffUtc: "2026-06-18T22:00:00.000Z" }),
      m({ id: "old-early", kickoffUtc: "2026-06-13T19:00:00.000Z" }),
    ];

    const groups = groupByDate(matches, "desc");

    expect(groups.map((g) => g.dateKey)).toEqual(["2026-06-18", "2026-06-13"]);
    expect(groups[1]!.matches.map((match) => match.id)).toEqual(["old-late", "old-early"]);
  });

  it("adds a today tab filter", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00.000Z"));
    try {
      const matches = [
        m({ id: "today", kickoffUtc: "2026-06-27T18:00:00.000Z" }),
        m({ id: "tomorrow", kickoffUtc: "2026-06-28T18:00:00.000Z" }),
      ];

      expect(applyTabFilter(matches, "today").map((match) => match.id)).toEqual(["today"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows all live matches in the live tab filter", () => {
    const matches = [
      m({ id: "live-a", status: "live" }),
      m({ id: "live-b", status: "halftime" }),
      m({ id: "scheduled", status: "scheduled" }),
      m({ id: "finished", status: "finished" }),
    ];

    expect(applyTabFilter(matches, "live").map((match) => match.id)).toEqual([
      "live-a",
      "live-b",
    ]);
  });

  it("filters knockout matches for the bracket tab", () => {
    const matches = [
      m({ id: "group", stage: "group" }),
      m({ id: "r32", stage: "round_of_32" }),
      m({ id: "final", stage: "final" }),
    ];

    expect(applyTabFilter(matches, "bracket").map((match) => match.id)).toEqual([
      "r32",
      "final",
    ]);
  });

  it("can sort live matches before scheduled matches for today's list", () => {
    const matches = [
      m({ id: "late-scheduled", status: "scheduled", kickoffUtc: "2026-06-27T23:30:00.000Z" }),
      m({ id: "early-live", status: "live", kickoffUtc: "2026-06-27T20:00:00.000Z" }),
      m({ id: "late-live", status: "halftime", kickoffUtc: "2026-06-27T21:00:00.000Z" }),
    ];

    expect(sortLiveFirst(matches, "desc").map((match) => match.id)).toEqual([
      "late-live",
      "early-live",
      "late-scheduled",
    ]);
  });
});

describe("live elapsed labels", () => {
  it("estimates live elapsed time from kickoff", () => {
    const match = m({
      status: "live",
      kickoffUtc: "2026-06-27T23:30:00.000Z",
    });

    expect(elapsedLabel(match, new Date("2026-06-27T23:30:00.000Z"))).toBe("1'");
    expect(elapsedLabel(match, new Date("2026-06-28T00:05:00.000Z"))).toBe("36'");
    expect(elapsedLabel(match, new Date("2026-06-28T00:18:00.000Z"))).toBe("45+ min");
    expect(elapsedLabel(match, new Date("2026-06-28T01:00:00.000Z"))).toBe("76'");
  });

  it("uses HT for halftime and omits elapsed time outside live states", () => {
    expect(elapsedLabel(m({ status: "halftime" }))).toBe("HT");
    expect(elapsedLabel(m({ status: "scheduled" }))).toBeUndefined();
    expect(elapsedLabel(m({ status: "finished" }))).toBeUndefined();
  });

  it("describes stoppage-time labels clearly", () => {
    const match = m({
      status: "live",
      kickoffUtc: "2026-06-27T23:30:00.000Z",
    });

    expect(elapsedClock(match, new Date("2026-06-28T00:18:00.000Z"))).toEqual({
      label: "45+ min",
      description: "Estimated first-half stoppage time",
    });
    expect(elapsedClock(match, new Date("2026-06-28T01:16:00.000Z"))).toEqual({
      label: "90+ min",
      description: "Estimated second-half stoppage time",
    });
  });
});

describe("venue normalization map", () => {
  const openfootballGrounds = [
    ["Mexico City", "azteca"],
    ["Guadalajara (Zapopan)", "akron"],
    ["Atlanta", "mercedes-benz"],
    ["Monterrey (Guadalupe)", "bbva"],
    ["Toronto", "bmo-field"],
    ["San Francisco Bay Area (Santa Clara)", "levis"],
    ["Los Angeles (Inglewood)", "sofi"],
    ["Vancouver", "bc-place"],
    ["Seattle", "lumen"],
    ["New York/New Jersey (East Rutherford)", "metlife"],
    ["Boston (Foxborough)", "gillette"],
    ["Philadelphia", "lincoln-financial"],
    ["Miami (Miami Gardens)", "hard-rock"],
    ["Houston", "nrg"],
    ["Kansas City", "arrowhead"],
    ["Dallas (Arlington)", "att"],
  ] as const;

  it("maps every openfootball ground string to the right stadiumId", () => {
    for (const [raw, id] of openfootballGrounds) {
      expect(normalizeVenue(raw)).toBe(id);
    }
  });

  it("maps FIFA / venue-name forms, including BC Place variants", () => {
    expect(normalizeVenue("BC Place")).toBe("bc-place");
    expect(normalizeVenue("BC Place Vancouver")).toBe("bc-place");
    expect(normalizeVenue("Vancouver Stadium")).toBe("bc-place");
    expect(normalizeVenue("Estadio Azteca")).toBe("azteca");
    expect(normalizeVenue("Levi's Stadium")).toBe("levis");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(normalizeVenue("  vAnCoUvEr ")).toBe("bc-place");
  });

  it("returns undefined for an unknown venue", () => {
    expect(normalizeVenue("Wembley")).toBeUndefined();
    expect(normalizeVenue("")).toBeUndefined();
    expect(normalizeVenue(null)).toBeUndefined();
  });

  it("covers every stadium id at least once", () => {
    const reached = new Set<string>(openfootballGrounds.map(([, id]) => id));
    for (const s of STADIUMS) expect(reached.has(s.id)).toBe(true);
  });
});

describe("football-data.org adapter — status mapping", () => {
  it("maps provider statuses and resolves venue to canonical stadiumId", () => {
    const out = normalizeFootballData({
      matches: [
        {
          id: 1,
          utcDate: "2026-06-13T22:00:00Z",
          status: "LIVE",
          stage: "GROUP_STAGE",
          group: "GROUP_B",
          homeTeam: { name: "Canada" },
          awayTeam: { name: "Croatia" },
          score: { fullTime: { home: 1, away: 0 } },
          venue: "BC Place",
        },
        { id: 2, utcDate: "2026-07-19T19:00:00Z", status: "FINISHED", stage: "FINAL", venue: "MetLife Stadium" },
      ],
    });
    expect(out[0]!.status).toBe("live");
    expect(out[0]!.stadiumId).toBe("bc-place");
    expect(out[0]!.group).toBe("B");
    expect(out[0]!.homeScore).toBe(1);
    expect(out[1]!.status).toBe("finished");
    expect(out[1]!.stage).toBe("final");
    expect(out[1]!.stadiumId).toBe("metlife");
  });

  it("degrades gracefully when venue is null (the pre-launch unknown)", () => {
    const out = normalizeFootballData({
      matches: [{ id: 3, utcDate: "2026-06-13T22:00:00Z", status: "TIMED", venue: null }],
    });
    expect(out[0]!.stadiumId).toBe("unknown");
    expect(out[0]!.status).toBe("scheduled");
  });

  it("reads penalty shootout scores and resolves venue", () => {
    const out = normalizeFootballData({
      matches: [
        {
          id: 4,
          utcDate: "2026-07-03T22:00:00Z",
          status: "FINISHED",
          stage: "ROUND_OF_16",
          homeTeam: { name: "Canada" },
          awayTeam: { name: "Brazil" },
          score: { fullTime: { home: 1, away: 1 }, penalties: { home: 4, away: 3 } },
          venue: "AT&T Stadium",
        },
      ],
    });
    expect(out[0]!.homeScore).toBe(1);
    expect(out[0]!.awayScore).toBe(1);
    expect(out[0]!.homePens).toBe(4);
    expect(out[0]!.awayPens).toBe(3);
    expect(out[0]!.stadiumId).toBe("att");
  });

  it("treats a scored match as finished when the provider status lags as SCHEDULED", () => {
    const out = normalizeFootballData({
      matches: [
        {
          id: 5,
          utcDate: "2026-06-27T23:30:00Z",
          status: "TIMED",
          stage: "GROUP_STAGE",
          homeTeam: { name: "DR Congo" },
          awayTeam: { name: "Uzbekistan" },
          score: { fullTime: { home: 3, away: 1 } },
          venue: "Lumen Field",
        },
      ],
    });
    expect(out[0]!.status).toBe("finished");
    expect(out[0]!.homeScore).toBe(3);
    expect(out[0]!.awayScore).toBe(1);
  });
});
