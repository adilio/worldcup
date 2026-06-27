import type { Match } from "../lib/types.ts";
import { statusLabel, stageLabel, isLive, hasScore, hasPens } from "../lib/matchStatus.ts";
import { dualTime, dateHeading, formatTime } from "../lib/formatDate.ts";
import { downloadIcs } from "../lib/calendar.ts";
import { shareMatch, canShare } from "../lib/share.ts";

type Props = {
  match: Match;
  noSpoiler: boolean;
  hero?: boolean;
};

export function MatchCard({ match, noSpoiler, hero = false }: Props) {
  const live = isLive(match.status);
  const showScore = hasScore(match) && !noSpoiler;
  const times = dualTime(match.kickoffUtc, match.stadiumId);

  // The score/result is hidden in no-spoiler mode; otherwise show score when we
  // have one, falling back to the kickoff time for upcoming matches.
  const pens = hasPens(match) ? ` (${match.homePens}–${match.awayPens} pens)` : "";
  let scoreLine: string;
  if (noSpoiler && (hasScore(match) || match.status === "finished")) {
    scoreLine = "Score hidden";
  } else if (showScore) {
    scoreLine = `${match.homeScore}–${match.awayScore}${pens}`;
  } else {
    scoreLine = formatTime(match.kickoffUtc);
  }

  const statusText = noSpoiler && match.status === "finished" ? "" : statusLabel(match);

  return (
    <article class={`match-card${hero ? " match-card--hero" : ""}${live ? " match-card--live" : ""}`}>
      <div class="match-card__teams">
        <span class="match-card__team">{match.homeTeam}</span>
        <span class="match-card__vs">vs</span>
        <span class="match-card__team">{match.awayTeam}</span>
      </div>

      <div class="match-card__statusline">
        {live && <span class="badge badge--live">Live</span>}
        {!live && statusText && <span class="badge">{statusText}</span>}
        <span class={`match-card__score${showScore ? " match-card__score--has" : ""}`}>
          {scoreLine}
        </span>
      </div>

      <div class="match-card__stage">{stageLabel(match)}</div>

      <div class="match-card__venue">
        <span class="match-card__city">{match.city}</span>
        <span class="match-card__sep">·</span>
        <span class="match-card__stadium">{match.stadium}</span>
      </div>

      <div class="match-card__time">
        <span class="match-card__date">{dateHeading(match.kickoffUtc)}</span>
        <span class="match-card__sep">·</span>
        <span>{times.local}</span>
        {times.venue && <span class="match-card__venuetime">venue {times.venue}</span>}
      </div>

      {match.scorers && match.scorers.length > 0 && !noSpoiler && (
        <div class="match-card__scorers">{match.scorers.join(" · ")}</div>
      )}

      <div class="match-card__actions">
        {canShare() && (
          <button class="card-btn" type="button" onClick={() => void shareMatch(match)}>
            Share
          </button>
        )}
        <button class="card-btn" type="button" onClick={() => downloadIcs(match)}>
          Add to calendar
        </button>
      </div>
    </article>
  );
}
