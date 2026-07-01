import type { GroupStanding } from "../lib/standings.ts";
import { teamMark } from "../lib/teamMarks.ts";
import { EmptyState } from "./EmptyState.tsx";

type Props = {
  standings: GroupStanding[];
  noSpoiler: boolean;
};

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function GroupTable({ group, rows }: GroupStanding) {
  return (
    <section class="standings-group" aria-label={`Group ${group} standings`}>
      <h3 class="standings-group__title">Group {group}</h3>
      <table class="standings-table">
        <thead>
          <tr>
            <th class="standings-table__pos" scope="col">#</th>
            <th class="standings-table__team" scope="col">Team</th>
            <th scope="col" title="Played">P</th>
            <th scope="col" title="Won">W</th>
            <th scope="col" title="Drawn">D</th>
            <th scope="col" title="Lost">L</th>
            <th scope="col" title="Goal difference">GD</th>
            <th class="standings-table__pts" scope="col" title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const mark = teamMark(r.team);
            // Top two advance directly; the third-place row can still qualify as
            // one of the eight best third-placed teams, so mark it as a maybe.
            const zone = i < 2 ? " standings-row--qualify" : i === 2 ? " standings-row--playoff" : "";
            return (
              <tr key={r.team} class={`standings-row${zone}`}>
                <td class="standings-table__pos">{i + 1}</td>
                <td class="standings-table__team">
                  <span class={`team-mark${mark.flag ? " team-mark--flag" : ""}`}>{mark.text}</span>
                  <span class="standings-table__name">{r.team}</span>
                </td>
                <td>{r.played}</td>
                <td>{r.won}</td>
                <td>{r.drawn}</td>
                <td>{r.lost}</td>
                <td>{signed(r.goalDifference)}</td>
                <td class="standings-table__pts">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function StandingsView({ standings, noSpoiler }: Props) {
  if (noSpoiler) {
    return (
      <EmptyState
        title="Standings hidden"
        message="Turn off no-spoiler mode to see group tables."
      />
    );
  }
  if (!standings.length) {
    return (
      <EmptyState
        title="No standings yet"
        message="Group tables appear once the group stage begins."
      />
    );
  }
  return (
    <div class="standings-view">
      {standings.map((g) => (
        <GroupTable key={g.group} group={g.group} rows={g.rows} />
      ))}
    </div>
  );
}
