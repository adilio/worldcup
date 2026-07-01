import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Match, MatchesResponse } from "./lib/types.ts";
import { fetchMatches } from "./lib/apiClient.ts";
import {
  loadPreferredStadium,
  savePreferredStadium,
  loadNoSpoiler,
  saveNoSpoiler,
  loadPreferredTeam,
  savePreferredTeam,
  loadLastResponse,
  saveLastResponse,
} from "./lib/storage.ts";
import {
  filterByStadium,
  filterByTeam,
  teamsInMatches,
  applyTabFilter,
  selectHeroMatch,
  todaysMatches,
  ALL_TEAMS_ID,
  type FilterTab,
} from "./lib/matches.ts";
import { isLive } from "./lib/matchStatus.ts";
import { ALL_STADIUMS_ID, getStadium } from "./lib/stadiums.ts";
import { AppHeader } from "./components/AppHeader.tsx";
import { StadiumSelect } from "./components/StadiumSelect.tsx";
import { TeamSelect } from "./components/TeamSelect.tsx";
import { MatchCard } from "./components/MatchCard.tsx";
import { MatchList } from "./components/MatchList.tsx";
import { BracketView } from "./components/BracketView.tsx";
import { StandingsView } from "./components/StandingsView.tsx";
import { computeGroupStandings } from "./lib/standings.ts";
import { EmptyState } from "./components/EmptyState.tsx";
import { DataStatus } from "./components/DataStatus.tsx";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "groups", label: "Groups" },
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
  const [teamId, setTeamId] = useState<string>(loadPreferredTeam());
  const [tab, setTab] = useState<FilterTab>(tabFromUrl());
  const [noSpoiler, setNoSpoiler] = useState<boolean>(loadNoSpoiler());

  // Hydrate from the last cached response so the app renders instantly (and works
  // offline) while the network request is still in flight.
  const [data, setData] = useState<MatchesResponse | null>(() => loadLastResponse());
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
      saveLastResponse(res);
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
  const teams = useMemo(() => teamsInMatches(allMatches), [allMatches]);
  // The working set is scoped by both the stadium and the followed team, so the
  // hero, list, and polling cadence all reflect what the user is watching.
  const stadiumMatches = useMemo(
    () => filterByTeam(filterByStadium(allMatches, stadiumId), teamId),
    [allMatches, stadiumId, teamId],
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

  function changeTeam(team: string) {
    setTeamId(team);
    savePreferredTeam(team);
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
  const standings = useMemo(() => computeGroupStandings(allMatches), [allMatches]);
  const liveMatches = useMemo(
    () => stadiumMatches.filter((m) => isLive(m.status)),
    [stadiumMatches],
  );
  const hero = useMemo(() => selectHeroMatch(stadiumMatches), [stadiumMatches]);

  const stadiumName =
    stadiumId === ALL_STADIUMS_ID ? "All stadiums" : getStadium(stadiumId)?.name ?? "—";
  const isAllStadiums = stadiumId === ALL_STADIUMS_ID;
  const followingTeam = teamId !== ALL_TEAMS_ID;
  // What the hero and empty states are scoped to: a followed team takes priority
  // over the stadium; "All stadiums" with no team has no explicit scope label.
  const scopeLabel = followingTeam ? teamId : isAllStadiums ? null : stadiumName;

  return (
    <div class="app">
      <AppHeader />

      <div class="app__controls">
        <StadiumSelect value={stadiumId} onChange={changeStadium} />
        <TeamSelect value={teamId} teams={teams} onChange={changeTeam} />
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
                  ? scopeLabel
                    ? `Live · ${scopeLabel}`
                    : "Live now"
                  : scopeLabel
                    ? `Next · ${scopeLabel}`
                    : "Next up"}
              </h2>
              <div class="hero__cards">
                {(liveMatches.length > 0 ? liveMatches : [hero]).map((m) => (
                  <MatchCard key={m.id} match={m} noSpoiler={noSpoiler} hero />
                ))}
              </div>
            </section>
          ) : (
            <EmptyState
              title={scopeLabel ? `No matches for ${scopeLabel}` : "No matches"}
              message={
                followingTeam
                  ? "This team has no matches in the current view. Try All stadiums."
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

          {tab === "bracket" ? (
            <BracketView matches={bracketMatches} noSpoiler={noSpoiler} />
          ) : tab === "groups" ? (
            <StandingsView standings={standings} noSpoiler={noSpoiler} />
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
