import { DEFAULT_STADIUM_ID, getStadium } from "./stadiums.ts";
import { ALL_STADIUMS_ID } from "../data/stadiums.ts";

const STADIUM_KEY = "4dl-wc2026-preferred-stadium";
const SPOILER_KEY = "4dl-wc2026-no-spoiler";
const CANADA_KEY = "4dl-wc2026-canada-only";

function isValidStadiumId(id: string | null): id is string {
  return !!id && (id === ALL_STADIUMS_ID || !!getStadium(id));
}

/** Read the preferred stadium id, defaulting to BC Place. */
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

export function loadCanadaOnly(): boolean {
  try {
    return localStorage.getItem(CANADA_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveCanadaOnly(value: boolean): void {
  try {
    localStorage.setItem(CANADA_KEY, String(value));
  } catch {
    // Ignore.
  }
}
