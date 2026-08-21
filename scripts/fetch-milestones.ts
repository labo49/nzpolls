/**
 * Scrapes the event-annotation rows from the same "Table of polls" wikitable
 * (e.g. "Prime Minister ... survives a party leadership vote", "Budget 2026
 * is delivered") and writes them to data/milestones.json, for the poll
 * timeline chart to overlay on the trend lines.
 *
 * Run with: npm run fetch-milestones
 */
import { writeFile } from "node:fs/promises";
import { installDevProxyIfPresent, scrapeWikiMilestones } from "../lib/wikiPollScraper";

const WIKI_PAGE = "Opinion_polling_for_the_2026_New_Zealand_general_election";
const SOURCE_URL = `https://en.wikipedia.org/api/rest_v1/page/html/${WIKI_PAGE}`;
const OUTPUT_PATH = new URL("../data/milestones.json", import.meta.url);

async function main() {
  await installDevProxyIfPresent();

  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "nzpolls-scraper (https://github.com/labo49/nzpolls)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const milestones = scrapeWikiMilestones(html, "Table_of_polls");

  await writeFile(OUTPUT_PATH, JSON.stringify(milestones, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${milestones.length} milestones to data/milestones.json.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
