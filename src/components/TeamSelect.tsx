import { ALL_TEAMS_ID } from "../lib/matches.ts";
import { teamMark } from "../lib/teamMarks.ts";

type Props = {
  value: string;
  teams: string[];
  onChange: (team: string) => void;
};

/** Prefix the option label with the team's flag emoji when we have one. */
function optionLabel(team: string): string {
  const mark = teamMark(team);
  return mark.flag ? `${mark.text} ${team}` : team;
}

export function TeamSelect({ value, teams, onChange }: Props) {
  // If the followed team isn't in the current roster yet (e.g. schedule still
  // loading), keep it as an option so the select doesn't render blank.
  const options = value !== ALL_TEAMS_ID && !teams.includes(value) ? [value, ...teams] : teams;
  return (
    <div class="team-select">
      <label class="team-select__label" for="team">
        Follow a team
      </label>
      <select
        id="team"
        class="team-select__input"
        value={value}
        onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}
      >
        <option value={ALL_TEAMS_ID}>All teams</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {optionLabel(t)}
          </option>
        ))}
      </select>
    </div>
  );
}
