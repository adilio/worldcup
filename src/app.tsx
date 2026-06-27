import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Match, MatchesResponse } from "./lib/types.ts";
import { fetchMatches } from "./lib/apiClient.ts";
import {
  loadPreferredStadium,
  savePreferredStadium,
  loadNoSpoiler,
  saveNoSpoiler,
  loadCanadaOnly,
  saveCanadaOnly,
} from "./lib/storage.ts";
import {
  filterByStadium,
  filterByTeam,
  applyTabFilter,
  selectHeroMatch,
  todaysMatches,
  type FilterTab,
} from "./lib/matches.ts";
import { isLive } from "./lib/matchStatus.ts";
import { ALL_STADIUMS_ID, getStadium } from "./lib/stadiums.ts";
import { AppHeader } from "./components/AppHeader.tsx";
import { StadiumSelect } from "./components/StadiumSelect.tsx";
import { MatchCard } from "./components/MatchCard.tsx";
import { MatchList } from "./components/MatchList.tsx";
import { EmptyState } from "./components/EmptyState.tsx";
import { DataStatus } from "./components/DataStatus.tsx";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live" },
  { id: "results", label: "Results" },
];

// Polling cadence (ms) per the plan's conservative strategy.
const POLL_LIVE = 30_000;
const POLL_MATCHDAY = 5 * 60_000;
const POLL_IDLE = 30 * 60_000;

function pollInterval(stadiumMatches: Match[]): number {
  if (stadiumMatches.some((m) => isLive(m.status))) return POLL_LIVE;
  if (todaysMatches(stadiumMatches).length > 0) return POLL_MATCHDAY;
  return POLL_IDLE;
}

export function App() {
  const [stadiumId, setStadiumId] = useState<string>(loadPreferredStadium());
  const [tab, setTab] = useState<FilterTab>("all");
  const [noSpoiler, setNoSpoiler] = useState<boolean>(loadNoSpoiler());
  const [canadaOnly, setCanadaOnly] = useState<boolean>(loadCanadaOnly());

  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetchMatches(ac.signal);
      setData(res);
      setError(null);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Could not load match data.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Initial load.
  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, []);

  const allMatches = data?.matches ?? [];
  const stadiumMatches = useMemo(
    () => filterByStadium(allMatches, stadiumId),
    [allMatches, stadiumId],
  );
  // Canada filter composes on top of the stadium filter so a user can follow
  // Canada across every stadium (pick "All stadiums" + Canada only).
  const scopedMatches = useMemo(
    () => (canadaOnly ? filterByTeam(stadiumMatches, "Canada") : stadiumMatches),
    [stadiumMatches, canadaOnly],
  );

  // Adaptive polling: cadence depends on whether the scoped set has a live
  // match, a match today, or nothing today.
  useEffect(() => {
    if (!data) return;
    const interval = pollInterval(scopedMatches);
    const id = setInterval(() => void load(), interval);
    return () => clearInterval(id);
  }, [data, scopedMatches]);

  function changeStadium(id: string) {
    setStadiumId(id);
    savePreferredStadium(id);
  }

  function toggleSpoiler() {
    const next = !noSpoiler;
    setNoSpoiler(next);
    saveNoSpoiler(next);
  }

  function toggleCanada() {
    const next = !canadaOnly;
    setCanadaOnly(next);
    saveCanadaOnly(next);
  }

  const visible = useMemo(
    () => applyTabFilter(scopedMatches, tab),
    [scopedMatches, tab],
  );
  const hero = useMemo(() => selectHeroMatch(scopedMatches), [scopedMatches]);

  const stadiumName =
    stadiumId === ALL_STADIUMS_ID ? "All stadiums" : getStadium(stadiumId)?.name ?? "—";
  const isAllStadiums = stadiumId === ALL_STADIUMS_ID;

  return (
    <div class="app">
      <AppHeader />

      <div class="app__controls">
        <StadiumSelect value={stadiumId} onChange={changeStadium} />
        <div class="app__toggles">
          <button
            type="button"
            class={`chip${canadaOnly ? " chip--active" : ""}`}
            aria-pressed={canadaOnly}
            onClick={toggleCanada}
          >
            🇨🇦 Canada only
          </button>
          <label class="spoiler-toggle">
            <input type="checkbox" checked={noSpoiler} onChange={toggleSpoiler} />
            <span>No-spoiler</span>
          </label>
        </div>
      </div>

      {loading && !data && (
        <div class="app__loading">
          <EmptyState title="Loading matches…" />
        </div>
      )}

      {error && !data && (
        <EmptyState title="Something went wrong" message={error} />
      )}

      {data && (
        <>
          {hero ? (
            <section class="hero">
              <h2 class="hero__heading">
                {hero.status === "live" || hero.status === "halftime"
                  ? isAllStadiums
                    ? "Live now"
                    : `Live at ${stadiumName}`
                  : isAllStadiums
                    ? "Next up"
                    : `Next at ${stadiumName}`}
              </h2>
              <MatchCard match={hero} noSpoiler={noSpoiler} hero />
            </section>
          ) : (
            <EmptyState
              title={`No ${canadaOnly ? "Canada " : ""}matches at ${stadiumName}`}
              message={
                canadaOnly
                  ? "Try All stadiums, or turn off the Canada filter."
                  : "Try selecting a different stadium."
              }
            />
          )}

          <nav class="filters" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                class={`filters__tab${tab === t.id ? " filters__tab--active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {visible.length > 0 ? (
            <MatchList matches={visible} noSpoiler={noSpoiler} />
          ) : (
            <EmptyState
              title="No matches here"
              message={
                tab === "live"
                  ? "No live matches at this stadium right now."
                  : "Nothing to show for this filter."
              }
            />
          )}

          <DataStatus
            source={data.source}
            fallbackUsed={data.fallbackUsed}
            lastUpdated={data.lastUpdated}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
