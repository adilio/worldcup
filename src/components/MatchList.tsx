import type { Match } from "../lib/types.ts";
import { groupByDate } from "../lib/matches.ts";
import { dateHeading } from "../lib/formatDate.ts";
import { MatchCard } from "./MatchCard.tsx";

type Props = {
  matches: Match[];
  noSpoiler: boolean;
  liveFirst?: boolean;
  dir?: "asc" | "desc";
};

export function MatchList({ matches, noSpoiler, liveFirst = false, dir = "desc" }: Props) {
  const groups = groupByDate(matches, dir, liveFirst);
  return (
    <div class="match-list">
      {groups.map((g) => (
        <section key={g.dateKey} class="match-list__group">
          <h3 class="match-list__date">{dateHeading(g.iso)}</h3>
          <div class="match-list__cards">
            {g.matches.map((m) => (
              <MatchCard key={m.id} match={m} noSpoiler={noSpoiler} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
