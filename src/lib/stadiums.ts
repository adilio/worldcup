import type { Stadium } from "./types.ts";
import { STADIUMS, ALL_STADIUMS_ID, DEFAULT_STADIUM_ID } from "../data/stadiums.ts";

export { STADIUMS, ALL_STADIUMS_ID, DEFAULT_STADIUM_ID };

const BY_ID = new Map<string, Stadium>(STADIUMS.map((s) => [s.id, s]));

export function getStadium(id: string): Stadium | undefined {
  return BY_ID.get(id);
}

/** "Vancouver (BC Place)" — the city-led selector label. */
export function stadiumLabel(s: Stadium): string {
  return `${s.city} (${s.name})`;
}

/** Stadiums sorted by city for the selector. */
export function stadiumsByCity(): Stadium[] {
  return [...STADIUMS].sort((a, b) => a.city.localeCompare(b.city));
}

/**
 * Explicit venue normalization map. Every provider names venues differently:
 * openfootball uses a city string ("Vancouver"), FIFA materials use a venue
 * name ("BC Place Vancouver" / "Vancouver Stadium"), and football-data.org
 * returns its own stadium string. Each alias maps to the canonical stadiumId.
 *
 * A silent mismatch means BC Place matches disappear from the default view —
 * the one failure this app cannot have — so the map is explicit and tested.
 * Keys are matched case-insensitively after trimming.
 */
const VENUE_ALIASES: Record<string, string> = {
  // --- openfootball ground strings (the static spine) ---
  vancouver: "bc-place",
  toronto: "bmo-field",
  atlanta: "mercedes-benz",
  "boston (foxborough)": "gillette",
  "dallas (arlington)": "att",
  houston: "nrg",
  "kansas city": "arrowhead",
  "los angeles (inglewood)": "sofi",
  "miami (miami gardens)": "hard-rock",
  "new york/new jersey (east rutherford)": "metlife",
  philadelphia: "lincoln-financial",
  "san francisco bay area (santa clara)": "levis",
  seattle: "lumen",
  "guadalajara (zapopan)": "akron",
  "mexico city": "azteca",
  "monterrey (guadalupe)": "bbva",

  // --- FIFA / football-data.org venue-name forms ---
  "bc place": "bc-place",
  "bc place vancouver": "bc-place",
  "vancouver stadium": "bc-place",
  "bmo field": "bmo-field",
  "toronto stadium": "bmo-field",
  "mercedes-benz stadium": "mercedes-benz",
  "atlanta stadium": "mercedes-benz",
  "gillette stadium": "gillette",
  "boston stadium": "gillette",
  foxborough: "gillette",
  "at&t stadium": "att",
  "att stadium": "att",
  "dallas stadium": "att",
  arlington: "att",
  "nrg stadium": "nrg",
  "houston stadium": "nrg",
  "arrowhead stadium": "arrowhead",
  "kansas city stadium": "arrowhead",
  "sofi stadium": "sofi",
  "los angeles stadium": "sofi",
  inglewood: "sofi",
  "hard rock stadium": "hard-rock",
  "miami stadium": "hard-rock",
  "metlife stadium": "metlife",
  "new york new jersey stadium": "metlife",
  "new york/new jersey stadium": "metlife",
  "east rutherford": "metlife",
  "lincoln financial field": "lincoln-financial",
  "philadelphia stadium": "lincoln-financial",
  "levi's stadium": "levis",
  "levis stadium": "levis",
  "san francisco bay area stadium": "levis",
  "santa clara": "levis",
  "lumen field": "lumen",
  "seattle stadium": "lumen",
  "estadio akron": "akron",
  "estadio guadalajara": "akron",
  "guadalajara stadium": "akron",
  guadalajara: "akron",
  zapopan: "akron",
  "estadio azteca": "azteca",
  "estadio banorte": "azteca",
  "estadio banorte (azteca)": "azteca",
  "mexico city stadium": "azteca",
  "estadio bbva": "bbva",
  "monterrey stadium": "bbva",
  monterrey: "bbva",
};

/**
 * Resolve a raw provider venue string to a canonical stadiumId, or `undefined`
 * if it cannot be matched. Tries exact alias, then a token-substring fallback
 * against stadium names and cities so minor provider wording changes still map.
 */
export function normalizeVenue(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  if (!key) return undefined;

  const exact = VENUE_ALIASES[key];
  if (exact) return exact;

  // Fallback: does the raw string contain a known stadium name or city?
  for (const s of STADIUMS) {
    const name = s.name.toLowerCase();
    const city = s.city.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim();
    if (key.includes(name) || (city.length > 3 && key.includes(city))) {
      return s.id;
    }
  }
  return undefined;
}
