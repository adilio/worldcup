import { getStadium } from "./stadiums.ts";

// All formatting uses Intl.DateTimeFormat — no date library needed.

/** e.g. "5:00 PM" in the given IANA timezone (or the browser's if omitted). */
export function formatTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

/** Short timezone abbreviation, e.g. "PDT", for a given instant + zone. */
function timezoneAbbr(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(new Date(iso));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

/** e.g. "Sat, Jun 28" in the user's local timezone. */
export function formatDateShort(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(iso));
}

/** Human date heading, with Today/Tomorrow relative labels in user-local time. */
export function dateHeading(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const dayKey = (x: Date) =>
    new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  const target = dayKey(d);
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const yesterday = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  if (target === today) return "Today";
  if (target === tomorrow) return "Tomorrow";
  if (target === yesterday) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Build the two display times shown on a card: the user's local time and the
 * venue-local time (with abbreviations). Returns the venue line only when it
 * differs from local, so single-timezone users don't see a redundant line.
 */
export function dualTime(iso: string, stadiumId: string): { local: string; venue?: string } {
  const localAbbr = timezoneAbbr(iso, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const local = `${formatTime(iso)} ${localAbbr}`.trim();

  const stadium = getStadium(stadiumId);
  if (!stadium) return { local };

  const venueTime = formatTime(iso, stadium.timezone);
  const venueAbbr = timezoneAbbr(iso, stadium.timezone);
  const venue = `${venueTime} ${venueAbbr}`.trim();

  // Hide the venue line if it renders identically to local time.
  if (venue === local) return { local };
  return { local, venue };
}

/** "Last checked: 2:41 PM" style timestamp for the data status line. */
export function formatLastUpdated(iso: string): string {
  return formatTime(iso);
}
