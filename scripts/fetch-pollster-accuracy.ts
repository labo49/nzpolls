/**
 * One-off historical calibration: for each pollster currently tracked in
 * data/polls.json, finds their final poll before the 2023 general election
 * (scraped from Wikipedia's *2023* opinion-polling page -- a separate page
 * from the one scripts/fetch-polls.ts uses) and compares it to the actual
 * 2023 result to get a mean absolute error in percentage points.
 *
 * This does NOT need to be re-run on a schedule -- the 2023 election is a
 * fixed reference point. Re-run only if data/polls.json's pollster roster
 * changes, or once real 2026 results exist and a rebase is worth doing.
 *
 * Run with: npx tsx scripts/fetch-pollster-accuracy.ts
 */
import { writeFile } from "node:fs/promises";
import { installDevProxyIfPresent, scrapeWikiPollTable } from "../lib/wikiPollScraper";
import type { ScrapedPoll } from "../lib/wikiPollScraper";
import { PARTIES } from "../lib/parties";
import { actualPolls } from "../lib/pollOfPolls";
import polls from "../data/polls.json" with { type: "json" };
import type { Poll } from "../lib/types";

const WIKI_PAGE = "Opinion_polling_for_the_2023_New_Zealand_general_election";
const SOURCE_URL = `https://en.wikipedia.org/api/rest_v1/page/html/${WIKI_PAGE}`;
const OUTPUT_PATH = new URL("../data/pollsterAccuracy.json", import.meta.url);
const ELECTION_DATE = "2023-10-14";
// Ignore a pollster's "final" pre-election poll if it's older than this --
// e.g. the only "Labour–Talbot Mills" entry on the 2023 page predates the
// election by ~2 years, which isn't a meaningful final-poll comparison.
const MAX_STALENESS_DAYS = 90;

// The 2023 page uses different pollster labels than the current dataset for
// the same house, due to rebrands and Wikipedia punctuation inconsistencies:
// - "1 News–Kantar Public" is 1 News's pollster before its 2023 rebrand to Verian.
// - "Newshub–Reid Research" is Reid Research's poll under its pre-2024 broadcast
//   partner, before Newshub's closure and Reid Research's move to RNZ.
// - "The Post–Freshwater Strategy" / "Taxpayers' Union-Curia" are the same
//   houses as the current dataset's "The Post/Freshwater Strategy" /
//   "Taxpayers' Union–Curia", just with a different dash/slash on the 2023 page.
const ALIASES: Record<string, string> = {
  "1 News–Kantar Public": "1 News–Verian",
  "Newshub–Reid Research": "RNZ–Reid Research",
  "The Post–Freshwater Strategy": "The Post/Freshwater Strategy",
  "Taxpayers' Union-Curia": "Taxpayers' Union–Curia",
};

function canonicalPollster(name: string): string {
  return ALIASES[name] ?? name;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (24 * 60 * 60 * 1000);
}

async function main() {
  await installDevProxyIfPresent();

  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "nzpolls-scraper (https://github.com/labo49/nzpolls)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const { polls: historicalPolls } = scrapeWikiPollTable(html, "Party_vote");

  const actualResult = historicalPolls.find(
    (p) => p.date === ELECTION_DATE && p.pollster.toLowerCase().includes("election result")
  );
  if (!actualResult) {
    throw new Error(`Could not find the ${ELECTION_DATE} election result row on the 2023 page`);
  }

  const currentPollsters = new Set(actualPolls(polls as Poll[]).map((p) => p.pollster));

  const latestByPollster = new Map<string, ScrapedPoll>();
  for (const p of historicalPolls) {
    if (p.date >= ELECTION_DATE) continue; // skip the result row itself and anything after
    const canonical = canonicalPollster(p.pollster);
    if (!currentPollsters.has(canonical)) continue; // not one of our tracked houses
    const existing = latestByPollster.get(canonical);
    if (!existing || existing.date < p.date) {
      latestByPollster.set(canonical, { ...p, pollster: canonical });
    }
  }

  const partyCodes = PARTIES.map((p) => p.code).filter((c) => c !== "OTH");

  const ratings = Array.from(latestByPollster.values())
    .filter((p) => daysBetween(p.date, ELECTION_DATE) <= MAX_STALENESS_DAYS)
    .map((p) => {
      const compared = partyCodes.filter(
        (code) => p.results[code] !== undefined && actualResult.results[code] !== undefined
      );
      const breakdown = compared.map((code) => {
        const polled = p.results[code] ?? 0;
        const actual = actualResult.results[code] ?? 0;
        return {
          party: code,
          polled,
          actual,
          error: Math.round(Math.abs(polled - actual) * 100) / 100,
        };
      });
      const meanAbsError = breakdown.reduce((a, b) => a + b.error, 0) / breakdown.length;
      return {
        pollster: p.pollster,
        finalPollDate: p.date,
        sourceUrl: p.sourceUrl,
        partiesCompared: compared.length,
        meanAbsError: Math.round(meanAbsError * 100) / 100,
        breakdown,
      };
    })
    .sort((a, b) => a.meanAbsError - b.meanAbsError);

  // Currently-tracked pollsters that didn't make it into `ratings`, and why
  // -- so the reliability page can explain an "unrated" tier rather than
  // just silently omitting a house.
  const ratedNames = new Set(ratings.map((r) => r.pollster));
  const omitted = Array.from(currentPollsters)
    .filter((name) => !ratedNames.has(name))
    .map((pollster) => {
      const closest = latestByPollster.get(pollster);
      const reason = closest
        ? `Closest pre-election poll on record was ${Math.round(daysBetween(closest.date, ELECTION_DATE))} days before the 2023 election (${closest.date}), beyond the ${MAX_STALENESS_DAYS}-day cutoff for a meaningful "final poll" comparison.`
        : "No poll from this house was found on the 2023 opinion-polling page at all.";
      return { pollster, reason };
    });

  const actualResultSummary: Record<string, number> = {};
  for (const code of partyCodes) {
    if (actualResult.results[code] !== undefined) actualResultSummary[code] = actualResult.results[code];
  }

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        methodology:
          "Mean absolute error (percentage points) between each pollster's final poll before the 2023 general election and the actual 2023 result, across parties both report. Lower is more accurate. Pollsters with no pre-election poll within 90 days of the 2023 election are omitted (insufficient data), not rated as unreliable.",
        referenceElection: ELECTION_DATE,
        actualResult: actualResultSummary,
        ratings,
        omitted,
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );
  console.log(`Wrote accuracy ratings for ${ratings.length} pollsters (${omitted.length} omitted) to data/pollsterAccuracy.json`);
  console.table(ratings.map((r) => ({ pollster: r.pollster, finalPollDate: r.finalPollDate, meanAbsError: r.meanAbsError })));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
