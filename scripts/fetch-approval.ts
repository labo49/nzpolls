/**
 * Scrapes the "Preferred prime minister" and "Leadership approval rating"
 * tables from the same Wikipedia opinion-polling page scripts/fetch-polls.ts
 * uses, and writes the result to data/approval.json.
 *
 * Run with: npm run fetch-approval
 */
import { writeFile } from "node:fs/promises";
import { installDevProxyIfPresent } from "../lib/wikiPollScraper";
import { scrapeLeaderTable, scrapeLeadershipApprovalTable } from "../lib/approvalScraper";

const WIKI_PAGE = "Opinion_polling_for_the_2026_New_Zealand_general_election";
const SOURCE_URL = `https://en.wikipedia.org/api/rest_v1/page/html/${WIKI_PAGE}`;
const OUTPUT_PATH = new URL("../data/approval.json", import.meta.url);

async function main() {
  await installDevProxyIfPresent();

  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "nzpolls-scraper (https://github.com/labo49/nzpolls)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  const preferredPm = scrapeLeaderTable(html, "Preferred_prime_minister_polling_table");
  const leadershipApproval = scrapeLeadershipApprovalTable(html, "Leadership_approval_rating");

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        source: `https://en.wikipedia.org/wiki/${WIKI_PAGE}`,
        preferredPm,
        leadershipApproval,
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );
  console.log(
    `Wrote ${preferredPm.polls.length} preferred-PM polls (skipped ${preferredPm.skipped}) and ` +
      `${leadershipApproval.polls.length} leadership-approval polls (skipped ${leadershipApproval.skipped}) to data/approval.json.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
