import { formatLastUpdated } from "../lib/formatDate.ts";

type Props = {
  source: string;
  fallbackUsed: boolean;
  lastUpdated: string;
  loading?: boolean;
};

export function DataStatus({ source, fallbackUsed, lastUpdated, loading }: Props) {
  return (
    <footer class="data-status">
      {fallbackUsed && (
        <p class="data-status__warning">
          Live score temporarily unavailable. Showing schedule data.
        </p>
      )}
      <p class="data-status__line">
        <span>Source: {source}</span>
        <span class="data-status__sep">·</span>
        <span>
          {loading ? "Updating…" : `Last checked: ${formatLastUpdated(lastUpdated)}`}
        </span>
      </p>
      <p class="data-status__note">
        Free live data can lag and is not broadcast-grade real-time.
      </p>
    </footer>
  );
}
