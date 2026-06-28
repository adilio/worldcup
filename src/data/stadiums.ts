import type { Stadium } from "../lib/types.ts";

/**
 * Canonical World Cup 2026 stadium metadata.
 *
 * The selector leads with the city (people recognize "Seattle" or "Vancouver"
 * faster than the stadium name), composed at render time as `City (Stadium)`.
 *
 * Verify names and timezones against the final FIFA schedule before launch.
 */
export const STADIUMS: Stadium[] = [
  { id: "bc-place", name: "BC Place", city: "Vancouver", country: "Canada", timezone: "America/Vancouver" },
  { id: "bmo-field", name: "BMO Field", city: "Toronto", country: "Canada", timezone: "America/Toronto" },
  { id: "mercedes-benz", name: "Mercedes-Benz Stadium", city: "Atlanta", country: "United States", timezone: "America/New_York" },
  { id: "gillette", name: "Gillette Stadium", city: "Boston (Foxborough)", country: "United States", timezone: "America/New_York" },
  { id: "att", name: "AT&T Stadium", city: "Dallas (Arlington)", country: "United States", timezone: "America/Chicago" },
  { id: "nrg", name: "NRG Stadium", city: "Houston", country: "United States", timezone: "America/Chicago" },
  { id: "arrowhead", name: "Arrowhead Stadium", city: "Kansas City", country: "United States", timezone: "America/Chicago" },
  { id: "sofi", name: "SoFi Stadium", city: "Los Angeles (Inglewood)", country: "United States", timezone: "America/Los_Angeles" },
  { id: "hard-rock", name: "Hard Rock Stadium", city: "Miami (Miami Gardens)", country: "United States", timezone: "America/New_York" },
  { id: "metlife", name: "MetLife Stadium", city: "New York New Jersey", country: "United States", timezone: "America/New_York" },
  { id: "lincoln-financial", name: "Lincoln Financial Field", city: "Philadelphia", country: "United States", timezone: "America/New_York" },
  { id: "levis", name: "Levi's Stadium", city: "San Francisco Bay Area (Santa Clara)", country: "United States", timezone: "America/Los_Angeles" },
  { id: "lumen", name: "Lumen Field", city: "Seattle", country: "United States", timezone: "America/Los_Angeles" },
  { id: "akron", name: "Estadio Akron", city: "Guadalajara", country: "Mexico", timezone: "America/Mexico_City" },
  { id: "azteca", name: "Estadio Banorte (Azteca)", city: "Mexico City", country: "Mexico", timezone: "America/Mexico_City" },
  { id: "bbva", name: "Estadio BBVA", city: "Monterrey", country: "Mexico", timezone: "America/Monterrey" },
];

/** Sentinel id for the "All stadiums" option in the selector. */
export const ALL_STADIUMS_ID = "all";

/** Default selection: show every stadium unless the user picks one. */
export const DEFAULT_STADIUM_ID = ALL_STADIUMS_ID;
