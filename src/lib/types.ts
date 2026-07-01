export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "unknown";

type Country = "Canada" | "United States" | "Mexico";

export type Stadium = {
  id: string;
  name: string;
  city: string;
  country: Country;
  timezone: string;
};

export type Stage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type Match = {
  id: string;
  providerId?: string;
  matchNumber?: number;
  stage: Stage;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  /** Penalty shootout result, present only for knockout matches decided on pens. */
  homePens?: number;
  awayPens?: number;
  status: MatchStatus;
  kickoffUtc: string;
  stadium: string;
  stadiumId: string;
  city: string;
  country: string;
  scorers?: string[];
  lastUpdated?: string;
  /** Original bracket slot code (e.g. "W73"), preserved after team name is resolved. */
  homeSlot?: string;
  awaySlot?: string;
};

/** Response envelope from the Netlify matches function. */
export type MatchesResponse = {
  app: string;
  defaultStadium: string;
  source: string;
  fallbackUsed: boolean;
  lastUpdated: string;
  matches: Match[];
};
