import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Match, MatchesResponse } from "./lib/types.ts";
import { fetchMatches } from "./lib/apiClient.ts";
import {
  loadPreferredStadium,
  savePreferredStadium,
  loadNoSpoiler,
  saveNoSpoiler,
} from "./lib/storage.ts";
import {
  filterByStadium,
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
import { BracketView } from "./components/BracketView.tsx";
import { EmptyState } from "./components/EmptyState.tsx";
import { DataStatus } from "./components/DataStatus.tsx";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "bracket", label: "Bracket" },
  { id: "upcoming", label: "Upcoming" },
  { id: "results", label: "Results" },
  { id: "all", label: "All" },
];
const TAB_IDS = new Set<FilterTab>(TABS.map((t) => t.id));

function tabFromUrl(): FilterTab {
  const raw = new URLSearchParams(window.location.search).get("tab");
  return raw && TAB_IDS.has(raw as FilterTab) ? (raw as FilterTab) : "today";
}

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
  const [tab, setTab] = useState<FilterTab>(tabFromUrl());
  const [noSpoiler, setNoSpoiler] = useState<boolean>(loadNoSpoiler());

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

  // Adaptive polling: cadence depends on whether the selected stadium has a
  // live match, a match today, or nothing today.
  useEffect(() => {
    if (!data) return;
    const interval = pollInterval(stadiumMatches);
    const id = setInterval(() => void load(), interval);
    return () => clearInterval(id);
  }, [data, stadiumMatches]);

  // Keep the URL in sync with the active tab so it can be linked/shared, and
  // support browser back/forward between tabs.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "today") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    if (url.href !== window.location.href) {
      window.history.pushState({ tab }, "", url);
    }
  }, [tab]);

  useEffect(() => {
    function onPopState() {
      setTab(tabFromUrl());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function changeStadium(id: string) {
    setStadiumId(id);
    savePreferredStadium(id);
  }

  function toggleSpoiler() {
    const next = !noSpoiler;
    setNoSpoiler(next);
    saveNoSpoiler(next);
  }

  const visible = useMemo(
    () => applyTabFilter(stadiumMatches, tab),
    [stadiumMatches, tab],
  );
  const bracketMatches = useMemo(() => applyTabFilter(allMatches, "bracket"), [allMatches]);
  const liveMatches = useMemo(
    () => stadiumMatches.filter((m) => isLive(m.status)),
    [stadiumMatches],
  );
  const hero = useMemo(() => selectHeroMatch(stadiumMatches), [stadiumMatches]);

  const stadiumName =
    stadiumId === ALL_STADIUMS_ID ? "All stadiums" : getStadium(stadiumId)?.name ?? "—";
  const isAllStadiums = stadiumId === ALL_STADIUMS_ID;

  return (
    <div class="app">
      <AppHeader />

      <div class="app__controls">
        <StadiumSelect value={stadiumId} onChange={changeStadium} />
        <label class="spoiler-toggle">
          <input type="checkbox" checked={noSpoiler} onChange={toggleSpoiler} />
          <span>No-spoiler</span>
        </label>
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
                {liveMatches.length > 0
                  ? isAllStadiums
                    ? "Live now"
                    : `Live at ${stadiumName}`
                  : isAllStadiums
                    ? "Next up"
                    : `Next at ${stadiumName}`}
              </h2>
              <div class="hero__cards">
                {(liveMatches.length > 0 ? liveMatches : [hero]).map((m) => (
                  <MatchCard key={m.id} match={m} noSpoiler={noSpoiler} hero />
                ))}
              </div>
            </section>
          ) : (
            <EmptyState
              title={`No matches at ${stadiumName}`}
              message="Try selecting a different stadium."
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

          {tab === "bracket" ? (
            <BracketView matches={bracketMatches} noSpoiler={noSpoiler} />
          ) : visible.length > 0 ? (
            <MatchList matches={visible} noSpoiler={noSpoiler} liveFirst={tab === "today"} dir={tab === "upcoming" ? "asc" : "desc"} />
          ) : (
            <EmptyState
              title="No matches here"
              message={
                tab === "today"
                  ? "No matches at this stadium today."
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
