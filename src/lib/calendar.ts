import type { Match } from "./types.ts";
import { stageLabel } from "./matchStatus.ts";

const MATCH_DURATION_MIN = 120; // 90' + halftime + stoppage buffer

/** Format a Date as an iCalendar UTC timestamp: 20260628T190000Z */
function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/** Build a single-event .ics file body for a match. */
function buildIcs(m: Match): string {
  const start = new Date(m.kickoffUtc);
  const end = new Date(start.getTime() + MATCH_DURATION_MIN * 60 * 1000);
  const title = `${m.homeTeam} vs ${m.awayTeam}`;
  const location = `${m.stadium}, ${m.city}`;
  const desc = `${stageLabel(m)} — World Cup 2026`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//World Cup Tracker//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${m.id}@worldcup.4dl.ca`,
    `DTSTAMP:${icsStamp(start)}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${escapeText(title)}`,
    `LOCATION:${escapeText(location)}`,
    `DESCRIPTION:${escapeText(desc)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** Trigger a download of the match's calendar event. */
export function downloadIcs(m: Match): void {
  const blob = new Blob([buildIcs(m)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${m.homeTeam}-vs-${m.awayTeam}`.replace(/\s+/g, "-").toLowerCase() + ".ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
