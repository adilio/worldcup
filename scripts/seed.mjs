// Seed step: convert the openfootball World Cup 2026 schedule into the static
// spine the app renders from. Run with: npm run seed
//
// What it does:
//   * fetches openfootball/worldcup.json (public domain, no key)
//   * converts "13:00 UTC-6" offset strings into a real ISO kickoffUtc
//   * assigns a FIFA-style matchNumber (group: 1-72 chronological, knockout: num)
//   * normalizes each ground string to a canonical stadiumId (shared map)
//   * writes public/data/world-cup-2026-static.json
//
// The static schedule is the source of truth for fixtures, venue, stage, group,
// and kickoff. Live providers only decorate it later.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Node >=23.6 strips TS types on import, so the seed reuses the exact same
// conversion + venue map the app and Netlify function use — no duplication.
import { convertOfMatch } from "../src/lib/openfootball.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const SOURCE_URL =
  process.env.OPENFOOTBALL_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const OUTPUT_PATH = resolve(REPO_ROOT, "public/data/world-cup-2026-static.json");

async function main() {
  console.log(`Fetching ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const raw = await res.json();
  const rawMatches = raw.matches ?? [];
  console.log(`Got ${rawMatches.length} matches`);

  const problems = [];
  const matches = rawMatches.map((m) => {
    const match = convertOfMatch(m);
    if (match.stadiumId === "unknown") problems.push(`Unmapped venue "${m.ground}" (${m.round})`);
    return match;
  });

  // Assign group-stage match numbers 1-72 by chronological order so numbering
  // is stable and deterministic. Knockout matches keep openfootball's `num`.
  const groupMatches = matches
    .filter((m) => m.stage === "group")
    .sort((a, b) => {
      if (a.kickoffUtc !== b.kickoffUtc) return a.kickoffUtc < b.kickoffUtc ? -1 : 1;
      const sa = a.stadiumId.localeCompare(b.stadiumId);
      if (sa !== 0) return sa;
      return a.homeTeam.localeCompare(b.homeTeam);
    });
  groupMatches.forEach((m, i) => {
    m.matchNumber = i + 1;
    m.id = `wc2026-${i + 1}`;
  });

  for (const m of matches) {
    if (m.matchNumber == null) {
      problems.push(`No matchNumber for ${m.stage} ${m.homeTeam} v ${m.awayTeam}`);
    }
  }

  matches.sort((a, b) => (a.kickoffUtc < b.kickoffUtc ? -1 : a.kickoffUtc > b.kickoffUtc ? 1 : 0));

  if (problems.length) {
    console.warn(`\n⚠️  ${problems.length} issue(s) found:`);
    for (const p of problems) console.warn(`   - ${p}`);
    throw new Error("Seed aborted: fix the issues above before writing output.");
  }

  // Sanity: confirm stage counts match a 48-team, 104-match tournament.
  const stageCounts = {};
  for (const m of matches) stageCounts[m.stage] = (stageCounts[m.stage] ?? 0) + 1;
  console.log("Stage counts:", stageCounts);

  const output = {
    source: "openfootball",
    note: "Static World Cup 2026 schedule spine. Live providers decorate this.",
    generatedAt: new Date().toISOString(),
    count: matches.length,
    matches,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`\n✅ Wrote ${matches.length} matches to ${OUTPUT_PATH}`);

  const byStadium = {};
  for (const m of matches) byStadium[m.stadiumId] = (byStadium[m.stadiumId] ?? 0) + 1;
  console.log("Matches per stadium:", byStadium);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
