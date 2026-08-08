/**
 * Scrapes the "Table of polls" from Wikipedia's opinion-polling page for the
 * next New Zealand general election and writes the result to data/polls.json.
 *
 * Run with: npm run fetch-polls
 */
import * as cheerio from "cheerio";
import { writeFile } from "node:fs/promises";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { PARTIES } from "../lib/parties";
import type { Poll } from "../lib/types";

// Sandboxed dev environments route outbound HTTPS through a local proxy that
// Node's fetch (unlike curl) doesn't pick up from HTTPS_PROXY automatically.
// Harmless/no-op in environments (e.g. CI, production) with direct internet access.
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

const WIKI_PAGE = "Opinion_polling_for_the_2026_New_Zealand_general_election";
const SOURCE_URL = `https://en.wikipedia.org/api/rest_v1/page/html/${WIKI_PAGE}`;
const OUTPUT_PATH = new URL("../data/polls.json", import.meta.url);
const META_PATH = new URL("../data/meta.json", import.meta.url);

// Header text -> party code, matched case-insensitively against the table's
// own column headers rather than assumed by position, so a reordering on
// Wikipedia's side doesn't silently corrupt the data.
const HEADER_TO_CODE: Record<string, string> = Object.fromEntries(
  PARTIES.filter((p) => p.code !== "OTH").map((p) => [p.code, p.code])
);
HEADER_TO_CODE["OTHERS"] = "OTH";

function stripFootnotes(text: string): string {
  return text.replace(/\[[a-z0-9]+\]/gi, "").trim();
}

function parseNumber(raw: string): number | null {
  const cleaned = stripFootnotes(raw).replace(/,/g, "").trim();
  if (!cleaned || cleaned === "–" || cleaned === "-" || /^n\/a$/i.test(cleaned)) {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "nzpolls-scraper (https://github.com/labo49/nzpolls)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const heading = $("#Table_of_polls");
  if (heading.length === 0) {
    throw new Error("Could not find #Table_of_polls heading on the page");
  }
  const table = heading.closest("section").find("table.wikitable").first();
  if (table.length === 0) {
    throw new Error("Could not find the polls table under #Table_of_polls");
  }

  const allRows = table.find("tr");
  const headerCells = allRows.first().find("th");
  const columnCodes: (string | null)[] = headerCells
    .map((_, el) => {
      const text = $(el).text().trim().toUpperCase();
      if (text.startsWith("DATE")) return "DATE";
      if (text.startsWith("POLLING")) return "POLLSTER";
      if (text.startsWith("SAMPLE")) return "SAMPLE";
      if (text.startsWith("LEAD")) return "LEAD";
      return HEADER_TO_CODE[text] ?? null;
    })
    .get();

  const polls: Poll[] = [];
  let skipped = 0;

  allRows.slice(1).each((_, rowEl) => {
    const tds = $(rowEl).find("td");
    // Event-annotation rows (e.g. "Budget 2026 is delivered") and stray
    // spacer/header-repeat rows don't have one cell per column -- skip them.
    if (tds.length !== columnCodes.length) {
      skipped++;
      return;
    }

    const dateTd = tds.eq(columnCodes.indexOf("DATE"));
    const isoDate = dateTd.attr("data-sort-value");
    const dateLabel = stripFootnotes(dateTd.text());
    if (!isoDate) {
      skipped++;
      return;
    }

    const pollsterTd = tds.eq(columnCodes.indexOf("POLLSTER"));
    const pollster = stripFootnotes(pollsterTd.text());
    const link = pollsterTd.find("a").first();
    const href = link.attr("href") ?? null;
    const sourceUrl = href && !href.startsWith("./") && !href.startsWith("#")
      ? href
      : href
        ? `https://en.wikipedia.org/wiki/${href.replace(/^\.\//, "")}`
        : null;

    const sampleSize = parseNumber(tds.eq(columnCodes.indexOf("SAMPLE")).text());

    const results: Poll["results"] = {};
    columnCodes.forEach((code, i) => {
      if (!code || code === "DATE" || code === "POLLSTER" || code === "SAMPLE" || code === "LEAD") {
        return;
      }
      const value = parseNumber(tds.eq(i).text());
      if (value !== null) {
        (results as Record<string, number>)[code] = value;
      }
    });

    polls.push({
      date: isoDate,
      dateLabel,
      pollster,
      sourceUrl,
      sampleSize,
      results,
    });
  });

  // Chronological, oldest first.
  polls.sort((a, b) => a.date.localeCompare(b.date));

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
