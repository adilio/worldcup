import type { Match, Stage } from "../lib/types.ts";
import { formatTime } from "../lib/formatDate.ts";
import { hasPens, hasScore, isLive, statusLabel } from "../lib/matchStatus.ts";
import { sortByKickoff } from "../lib/matches.ts";
import { teamMark } from "../lib/teamMarks.ts";

type Props = {
  matches: Match[];
  noSpoiler: boolean;
};

const KNOCKOUT_STAGES: { id: Stage; label: string }[] = [
  { id: "round_of_32", label: "Round of 32" },
  { id: "round_of_16", label: "Round of 16" },
  { id: "quarter_final", label: "Quarter-finals" },
  { id: "semi_final", label: "Semi-finals" },
  { id: "final", label: "Final" },
  { id: "third_place", label: "Third place" },
];

function scoreFor(match: Match, side: "home" | "away", noSpoiler: boolean): string {
  if (noSpoiler && (hasScore(match) || match.status === "finished")) return "—";
  const score = side === "home" ? match.homeScore : match.awayScore;
  const pens = side === "home" ? match.homePens : match.awayPens;
  if (hasPens(match) && typeof pens === "number") return `${score ?? "—"} (${pens})`;
  return typeof score === "number" ? String(score) : "";
}

function TeamRow({
  team,
  score,
  winner,
}: {
  team: string;
  score: string;
  winner: boolean;
}) {
  const mark = teamMark(team);
  return (
    <div class={`bracket-card__team${winner ? " bracket-card__team--winner" : ""}`}>
      <span class={`bracket-card__mark${mark.flag ? " bracket-card__mark--flag" : ""}`}>
        {mark.text}
      </span>
      <span class="bracket-card__name">{team}</span>
      <span class="bracket-card__score">{score}</span>
    </div>
  );
}

function winnerSide(match: Match, noSpoiler: boolean): "home" | "away" | undefined {
  if (noSpoiler || !hasScore(match) || match.status !== "finished") return undefined;
  const home = match.homePens ?? match.homeScore;
  const away = match.awayPens ?? match.awayScore;
  if (typeof home !== "number" || typeof away !== "number" || home === away) return undefined;
  return home > away ? "home" : "away";
}

function BracketCard({ match, noSpoiler }: { match: Match; noSpoiler: boolean }) {
  const live = isLive(match.status);
  const winner = winnerSide(match, noSpoiler);
  return (
    <article class={`bracket-card${live ? " bracket-card--live" : ""}`}>
      <div class="bracket-card__meta">
        <span>Match {match.matchNumber ?? "TBD"}</span>
        <span class="bracket-card__dot">·</span>
        <span>{statusLabel(match)}</span>
      </div>
      <TeamRow
        team={match.homeTeam}
        score={scoreFor(match, "home", noSpoiler)}
        winner={winner === "home"}
      />
      <TeamRow
        team={match.awayTeam}
        score={scoreFor(match, "away", noSpoiler)}
        winner={winner === "away"}
      />
      <div class="bracket-card__footer">
        <span>{formatTime(match.kickoffUtc)}</span>
        <span class="bracket-card__dot">·</span>
        <span>{match.city}</span>
      </div>
    </article>
  );
}

export function BracketView({ matches, noSpoiler }: Props) {
  const knockout = matches.filter((m) => m.stage !== "group");
  if (!knockout.length) return null;

  return (
    <div class="bracket-view" aria-label="World Cup knockout bracket">
      {KNOCKOUT_STAGES.map(({ id, label }) => {
        const roundMatches = sortByKickoff(knockout.filter((m) => m.stage === id));
        if (!roundMatches.length) return null;
        return (
          <section key={id} class="bracket-round">
            <h3 class="bracket-round__title">{label}</h3>
            <div class="bracket-round__matches">
              {roundMatches.map((m) => (
                <BracketCard key={m.id} match={m} noSpoiler={noSpoiler} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
