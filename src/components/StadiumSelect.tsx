import { stadiumsByCity, stadiumLabel } from "../lib/stadiums.ts";
import { ALL_STADIUMS_ID } from "../data/stadiums.ts";

type Props = {
  value: string;
  onChange: (id: string) => void;
};

export function StadiumSelect({ value, onChange }: Props) {
  const stadiums = stadiumsByCity();
  return (
    <div class="stadium-select">
      <label class="stadium-select__label" for="stadium">
        Preferred stadium
      </label>
      <select
        id="stadium"
        class="stadium-select__input"
        value={value}
        onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}
      >
        {stadiums.map((s) => (
          <option key={s.id} value={s.id}>
            {stadiumLabel(s)}
          </option>
        ))}
        <option value={ALL_STADIUMS_ID}>All stadiums</option>
      </select>
    </div>
  );
}
