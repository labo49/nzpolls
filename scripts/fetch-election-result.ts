/**
 * Builds data/electionResult.json: the 2026 general election's preliminary
 * result (ordinary votes only -- the Electoral Commission doesn't declare
 * the official, special-votes-included result until 27 Nov 2026), from
 * Wikipedia's "Results of the 2026 New Zealand general election" page --
 * national party vote (its pie-chart legend) and the electorate-by-
 * electorate winners (its Electorate_results table, via the same parser
 * already used for 2023/2020/2017's results pages).
 *
 * Runs as part of the twice-daily automated refresh: this page is actively
 * being filled in and corrected in the days after election night, and will
 * be replaced wholesale once the 27 Nov official count lands.
 *
 * Run with: npx tsx scripts/fetch-election-result.ts
 */
import { writeFile } from "node:fs/promises";
import { installDevProxyIfPresent } from "../lib/wikiPollScraper";
import { scrapeNationalPartyVoteLegend } from "../lib/electionResultScraper";
import { cleanElectorateName, parseElectorateResultsTable } from "../lib/electorateResults";

const WIKI_PAGE = "Results_of_the_2026_New_Zealand_general_election";
const OUTPUT_PATH = new URL("../data/electionResult.json", import.meta.url);

async function main() {
  await installDevProxyIfPresent();

  const url = `https://en.wikipedia.org/api/rest_v1/page/html/${WIKI_PAGE}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "nzpolls-scraper (https://github.com/labo49/nzpolls)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  const partyVote = scrapeNationalPartyVoteLegend(html);
  const electorateRows = parseElectorateResultsTable(html, "Electorate_results").map((r) => ({
    ...r,
    electorateName: cleanElectorateName(r.electorateName),
  }));

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        source: `https://en.wikipedia.org/wiki/${WIKI_PAGE}`,
        // Per the page's own "Release of results" note: ordinary votes
        // only, special votes (~15-20% of the total, historically) still
        // to come by the 27 Nov 2026 official declaration.
        preliminary: true,
        officialDeclarationDate: "2026-11-27",
        partyVote,
        electorates: electorateRows,
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );
  console.log(
    `Wrote preliminary results: ${electorateRows.length} of 71 electorates, national party vote for ${
      Object.keys(partyVote.results).length
    } parties.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
