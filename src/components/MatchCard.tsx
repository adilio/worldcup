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

function teamMark(team: string): string {
  return team
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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
  const stageText = stageLabel(match);

  return (
    <article class={`match-card${hero ? " match-card--hero" : ""}${live ? " match-card--live" : ""}`}>
      <div class="match-card__topline">
        <span>{stageText}</span>
        <span class="match-card__topline-dot">·</span>
        <span>{dateHeading(match.kickoffUtc)}</span>
      </div>

      <div class="match-card__scoreboard">
        <div class="match-card__side">
          <span class="team-mark">{teamMark(match.homeTeam)}</span>
          <span class="match-card__team">{match.homeTeam}</span>
        </div>

        <div class="match-card__middle">
          {showScore ? (
            <span class="match-card__score match-card__score--has">{scoreLine}</span>
          ) : (
            <>
              <span class="match-card__kickoff">{scoreLine}</span>
              <span class="match-card__vs">vs</span>
            </>
          )}
        </div>

        <div class="match-card__side match-card__side--away">
          <span class="match-card__team">{match.awayTeam}</span>
          <span class="team-mark">{teamMark(match.awayTeam)}</span>
        </div>
      </div>

      <div class="match-card__statusline">
        {live && <span class="badge badge--live">Live</span>}
        {!live && statusText && <span class="badge">{statusText}</span>}
        <span>{times.local}</span>
        {times.venue && <span class="match-card__venuetime">venue {times.venue}</span>}
      </div>

      <div class="match-card__venue">
        <span class="match-card__city">{match.city}</span>
        <span class="match-card__sep">·</span>
        <span class="match-card__stadium">{match.stadium}</span>
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
