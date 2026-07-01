import type { MatchesResponse } from "./types.ts";
import { DEFAULT_STADIUM_ID, getStadium } from "./stadiums.ts";
import { ALL_STADIUMS_ID } from "../data/stadiums.ts";
import { ALL_TEAMS_ID } from "./matches.ts";

const STADIUM_KEY = "4dl-wc2026-preferred-stadium";
const SPOILER_KEY = "4dl-wc2026-no-spoiler";
const TEAM_KEY = "4dl-wc2026-preferred-team";
const CACHE_KEY = "4dl-wc2026-last-response";

function isValidStadiumId(id: string | null): id is string {
  return !!id && (id === ALL_STADIUMS_ID || !!getStadium(id));
}

/** Read the preferred stadium id, defaulting to All stadiums. */
export function loadPreferredStadium(): string {
  try {
    const stored = localStorage.getItem(STADIUM_KEY);
    if (isValidStadiumId(stored)) return stored;
  } catch {
    // localStorage may be unavailable (private mode); fall through to default.
  }
  return DEFAULT_STADIUM_ID;
}

export function savePreferredStadium(id: string): void {
  try {
    localStorage.setItem(STADIUM_KEY, id);
  } catch {
    // Ignore write failures; the in-memory selection still works this session.
  }
}

export function loadNoSpoiler(): boolean {
  try {
    return localStorage.getItem(SPOILER_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveNoSpoiler(value: boolean): void {
  try {
    localStorage.setItem(SPOILER_KEY, String(value));
  } catch {
    // Ignore.
  }
}

/** Read the followed team name, defaulting to All teams. */
export function loadPreferredTeam(): string {
  try {
    const stored = localStorage.getItem(TEAM_KEY);
    if (stored) return stored;
  } catch {
    // localStorage unavailable; fall through to default.
  }
  return ALL_TEAMS_ID;
}

export function savePreferredTeam(team: string): void {
  try {
    localStorage.setItem(TEAM_KEY, team);
  } catch {
    // Ignore write failures; the in-memory selection still works this session.
  }
}

/**
 * Last successful matches payload, hydrated on load so the app renders instantly
 * — and stays useful fully offline — before the network resolves. The response's
 * own `lastUpdated` keeps the staleness honest via the DataStatus line.
 */
export function loadLastResponse(): MatchesResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatchesResponse;
    if (parsed && Array.isArray(parsed.matches)) return parsed;
  } catch {
    // Missing, corrupt, or unavailable; behave as if there's no cache.
  }
  return null;
}

export function saveLastResponse(res: MatchesResponse): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(res));
  } catch {
    // Quota exceeded or unavailable; the app still works without the cache.
  }
}
