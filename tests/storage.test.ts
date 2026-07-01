import { describe, it, expect, beforeEach, vi } from "vitest";
import type { MatchesResponse } from "../src/lib/types.ts";
import { loadLastResponse, saveLastResponse } from "../src/lib/storage.ts";

// Minimal in-memory localStorage stub — vitest runs in the node environment,
// which has no localStorage global.
function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", mock);
  return store;
}

const sample: MatchesResponse = {
  app: "4dl World Cup 2026",
  defaultStadium: "All stadiums",
  source: "football-data.org",
  fallbackUsed: false,
  lastUpdated: "2026-06-27T19:05:00Z",
  matches: [],
};

describe("offline last-good response cache", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("round-trips a saved response", () => {
    saveLastResponse(sample);
    expect(loadLastResponse()).toEqual(sample);
  });

  it("returns null when nothing is cached", () => {
    expect(loadLastResponse()).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem("4dl-wc2026-last-response", "{not json");
    expect(loadLastResponse()).toBeNull();
  });

  it("returns null when the payload lacks a matches array", () => {
    localStorage.setItem("4dl-wc2026-last-response", JSON.stringify({ app: "x" }));
    expect(loadLastResponse()).toBeNull();
  });

  it("swallows write failures (e.g. quota) without throwing", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    expect(() => saveLastResponse(sample)).not.toThrow();
  });
});
