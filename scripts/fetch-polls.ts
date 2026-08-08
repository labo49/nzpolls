/**
 * Scrapes the "Table of polls" from Wikipedia's opinion-polling page for the
 * next New Zealand general election and writes the result to data/polls.json.
 *
 * Run with: npm run fetch-polls
 */
import { writeFile } from "node:fs/promises";
import { installDevProxyIfPresent, scrapeWikiPollTable } from "../lib/wikiPollScraper";

const WIKI_PAGE = "Opinion_polling_for_the_2026_New_Zealand_general_election";
const SOURCE_URL = `https://en.wikipedia.org/api/rest_v1/page/html/${WIKI_PAGE}`;
const OUTPUT_PATH = new URL("../data/polls.json", import.meta.url);
const META_PATH = new URL("../data/meta.json", import.meta.url);

async function main() {
  await installDevProxyIfPresent();

  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "nzpolls-scraper (https://github.com/labo49/nzpolls)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const { polls, skipped } = scrapeWikiPollTable(html, "Table_of_polls");

  await writeFile(OUTPUT_PATH, JSON.stringify(polls, null, 2) + "\n", "utf-8");
  await writeFile(
    META_PATH,
    JSON.stringify({ fetchedAt: new Date().toISOString(), source: `https://en.wikipedia.org/wiki/${WIKI_PAGE}` }, null, 2) + "\n",
    "utf-8"
  );
  console.log(`Wrote ${polls.length} rows to data/polls.json (skipped ${skipped} non-poll rows).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
