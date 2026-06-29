import type { Match, Stage } from "../lib/types.ts";
import { formatTime, formatDateShort } from "../lib/formatDate.ts";
import { hasPens, hasScore, isLive, statusLabel } from "../lib/matchStatus.ts";
import { sortByKickoff } from "../lib/matches.ts";
import { teamMark } from "../lib/teamMarks.ts";
import { isPlaceholderTeam } from "../lib/mergeMatches.ts";

type Props = {
  matches: Match[];
  noSpoiler: boolean;
};

/** Extracts the match number from a bracket slot code like "W73" or "L12". */
function slotMatchNum(slot: string | undefined): number | undefined {
  if (!slot) return undefined;
  const m = /^[wl](\d{1,3})$/i.exec(slot);
  return m ? Number(m[1]) : undefined;
}

/**
 * Returns a map from match.id to display position so that matches feeding into
 * the same next-round slot are always rendered adjacent to each other.
 * Derived top-down: Final → SF → QF → R16 → R32.
 */
function bracketPositions(knockout: Match[]): Map<string, number> {
  const STAGES: Stage[] = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"];
  const pos = new Map<string, number>();

  // Seed the final by kickoff order.
  sortByKickoff(knockout.filter((m) => m.stage === "final")).forEach((m, i) =>
    pos.set(m.id, i),
  );

  // Walk from semi_final down to round_of_32.
  for (let si = STAGES.length - 2; si >= 0; si--) {
    const curr = knockout.filter((m) => m.stage === STAGES[si]);
    const next = knockout.filter((m) => m.stage === STAGES[si + 1]);

    // Sort next-stage matches by their already-computed position.
    const sortedNext = [...next].sort(
      (a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity),
    );

    const byNum = new Map(
      curr.filter((m) => m.matchNumber != null).map((m) => [m.matchNumber!, m]),
    );

    sortedNext.forEach((nm, ni) => {
      // Use the preserved slot code if the team name was already resolved; otherwise
      // fall back to the current homeTeam/awayTeam if they are still placeholders.
      const hSlot = nm.homeSlot ?? (isPlaceholderTeam(nm.homeTeam) ? nm.homeTeam : undefined);
      const aSlot = nm.awaySlot ?? (isPlaceholderTeam(nm.awayTeam) ? nm.awayTeam : undefined);
      const hNum = slotMatchNum(hSlot);
      const aNum = slotMatchNum(aSlot);
      if (hNum != null && byNum.has(hNum)) pos.set(byNum.get(hNum)!.id, ni * 2);
      if (aNum != null && byNum.has(aNum)) pos.set(byNum.get(aNum)!.id, ni * 2 + 1);
    });
  }

  return pos;
}

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
        <span>{formatDateShort(match.kickoffUtc)}</span>
        <span class="bracket-card__dot">·</span>
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
  const posMap = bracketPositions(knockout);

  return (
    <>
      <div class="bracket-view" aria-label="World Cup knockout bracket">
        {MAIN_BRACKET_STAGES.map(({ id, label, step }) => {
          const roundMatches = knockout
            .filter((m) => m.stage === id)
            .sort((a, b) => {
              const pa = posMap.get(a.id) ?? Infinity;
              const pb = posMap.get(b.id) ?? Infinity;
              if (pa !== pb) return pa - pb;
              return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
            });
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
