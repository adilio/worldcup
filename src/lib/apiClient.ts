import type { Match, MatchesResponse } from "./types.ts";
import { DEFAULT_STADIUM_ID, getStadium } from "./stadiums.ts";

const FUNCTION_URL = "/.netlify/functions/matches";
const STATIC_URL = "/data/world-cup-2026-static.json";

const APP_NAME = "World Cup Tracker";
const defaultStadiumName = getStadium(DEFAULT_STADIUM_ID)?.name ?? "BC Place";

type StaticFile = { source?: string; generatedAt?: string; matches: Match[] };

/**
 * Load matches. Prefers the Netlify function (static spine + live enhancement);
 * if the function is unavailable (e.g. `vite dev` without `netlify dev`, or an
 * outage) it falls back to the committed static schedule so the app always
 * renders. This is Layer 4 of the data strategy on the client side.
 */
export async function fetchMatches(signal?: AbortSignal): Promise<MatchesResponse> {
  try {
    const res = await fetch(FUNCTION_URL, { signal });
    if (res.ok) {
      const data = (await res.json()) as MatchesResponse;
      if (Array.isArray(data.matches)) return data;
    }
  } catch {
    // Fall through to the static schedule.
  }
  return loadStatic(signal);
}

async function loadStatic(signal?: AbortSignal): Promise<MatchesResponse> {
  const res = await fetch(STATIC_URL, { signal });
  if (!res.ok) throw new Error(`Failed to load schedule: ${res.status}`);
  const file = (await res.json()) as StaticFile;
  return {
    app: APP_NAME,
    defaultStadium: defaultStadiumName,
    source: "static schedule",
    fallbackUsed: true,
    lastUpdated: file.generatedAt ?? new Date().toISOString(),
    matches: file.matches,
  };
}
