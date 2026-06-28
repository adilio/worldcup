import type { Match, Stage } from "../lib/types.ts";
import { formatTime } from "../lib/formatDate.ts";
import { hasPens, hasScore, isLive, statusLabel } from "../lib/matchStatus.ts";
import { sortByKickoff } from "../lib/matches.ts";
import { teamMark } from "../lib/teamMarks.ts";

type Props = {
  matches: Match[];
  noSpoiler: boolean;
};

const MAIN_BRACKET_STAGES: { id: Stage; label: string; step: number }[] = [
  { id: "round_of_32", label: "Round of 32", step: 1 },
  { id: "round_of_16", label: "Round of 16", step: 2 },
  { id: "quarter_final", label: "Quarter-finals", step: 4 },
  { id: "semi_final", label: "Semi-finals", step: 8 },
  { id: "final", label: "Final", step: 16 },
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
  const thirdPlace = sortByKickoff(knockout.filter((m) => m.stage === "third_place"));

  return (
    <>
      <div class="bracket-view" aria-label="World Cup knockout bracket">
        {MAIN_BRACKET_STAGES.map(({ id, label, step }) => {
          const roundMatches = sortByKickoff(knockout.filter((m) => m.stage === id));
          if (!roundMatches.length) return null;
          return (
            <section
              key={id}
              class="bracket-round"
              style={{ "--round-step": String(step) }}
            >
              <h3 class="bracket-round__title">{label}</h3>
              <div class="bracket-round__matches">
                {roundMatches.map((m) => (
                  <div key={m.id} class="bracket-slot">
                    <BracketCard match={m} noSpoiler={noSpoiler} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {thirdPlace.length > 0 && (
        <section class="bracket-side-round" aria-label="Third place match">
          <h3 class="bracket-side-round__title">Third place</h3>
          <div class="bracket-side-round__matches">
            {thirdPlace.map((m) => (
              <BracketCard key={m.id} match={m} noSpoiler={noSpoiler} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
