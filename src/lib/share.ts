import type { Match } from "./types.ts";
import { stageLabel, hasScore } from "./matchStatus.ts";
import { formatDateShort, formatTime } from "./formatDate.ts";

export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function shareText(match: Match): string {
  const head = `${match.homeTeam} vs ${match.awayTeam}`;
  const score = hasScore(match) ? ` (${match.homeScore}–${match.awayScore})` : "";
  const when = `${formatDateShort(match.kickoffUtc)} ${formatTime(match.kickoffUtc)}`;
  return `${head}${score}\n${stageLabel(match)} · ${match.city} · ${match.stadium}\n${when}`;
}

/**
 * Share a match via the Web Share API, falling back to copying to the
 * clipboard. Swallows the user-cancelled error so it never surfaces.
 */
export async function shareMatch(match: Match): Promise<void> {
  const text = shareText(match);
  const url = "https://worldcup.4dl.ca";
  try {
    if (canShare()) {
      await navigator.share({ title: "World Cup Tracker", text, url });
      return;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    // Otherwise fall through to clipboard.
  }
  try {
    await navigator.clipboard?.writeText(`${text}\n${url}`);
  } catch {
    // Nothing more we can do silently.
  }
}
