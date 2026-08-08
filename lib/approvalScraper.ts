import * as cheerio from "cheerio";
import { parseDateLabelToISO, parseNumber, stripFootnotes } from "./wikiPollScraper";

export interface LeaderColumn {
  /** Full name from the header link's title attribute, e.g. "Christopher Luxon" -- stable identity even if the table's short display text changes. */
  key: string;
  /** Short display name as shown in the table header, e.g. "Luxon". */
  shortName: string;
}

export interface ScrapedLeaderRow {
  date: string;
  dateLabel: string;
  pollster: string;
  sourceUrl: string | null;
  sampleSize: number | null;
  results: Record<string, number>;
}

export interface ScrapeLeaderTableResult {
  polls: ScrapedLeaderRow[];
  leaders: LeaderColumn[];
  skipped: number;
}

/**
 * Parses a Wikipedia opinion-polling table shaped Date | Polling organisation
 * | Sample size | <one column per named leader> | Lead. Both the "Preferred
 * prime minister" and "Leadership approval rating" tables on the opinion
 * -polling page share exactly this structure and differ only in which
 * leaders/values they carry, so this one parser covers both -- leader
 * columns are discovered from the header row (any `<th>` with a link,
 * keyed by that link's title) rather than assumed from a fixed roster, so a
 * leadership change doesn't silently misalign columns.
 */
export function scrapeLeaderTable(html: string, headingId: string): ScrapeLeaderTableResult {
  const $ = cheerio.load(html);
  const heading = $(`#${headingId}`);
  if (heading.length === 0) {
    throw new Error(`Could not find #${headingId} heading on the page`);
  }
  const table = heading.closest("section").find("table.wikitable").first();
  if (table.length === 0) {
    throw new Error(`Could not find the table under #${headingId}`);
  }

  const allRows = table.find("tr");
  const headerCells = allRows.first().find("th");

  type ColumnKind = "date" | "pollster" | "sample" | "lead" | "leader" | null;
  const columnKinds: ColumnKind[] = [];
  const leaders: LeaderColumn[] = [];

  headerCells.toArray().forEach((el) => {
    const $el = $(el);
    const text = stripFootnotes($el.text());
    const upper = text.toUpperCase();
    if (upper.startsWith("DATE")) {
      columnKinds.push("date");
      return;
    }
    if (upper.startsWith("POLLING")) {
      columnKinds.push("pollster");
      return;
    }
    if (upper.startsWith("SAMPLE")) {
      columnKinds.push("sample");
      return;
    }
    if (upper.startsWith("LEAD")) {
      columnKinds.push("lead");
      return;
    }
    const link = $el.find("a").first();
    const key = link.attr("title") || text;
    if (!key) {
      columnKinds.push(null);
      return;
    }
    leaders.push({ key, shortName: text });
    columnKinds.push("leader");
  });

  const polls: ScrapedLeaderRow[] = [];
  let skipped = 0;

  allRows.slice(1).each((_, rowEl) => {
    const tds = $(rowEl).find("td");
    if (tds.length !== columnKinds.length) {
      skipped++;
      return;
    }

    const dateIdx = columnKinds.indexOf("date");
    const dateTd = tds.eq(dateIdx);
    const dateLabel = stripFootnotes(dateTd.text());
    const isoDate = parseDateLabelToISO(dateLabel) ?? dateTd.attr("data-sort-value") ?? null;
    if (!isoDate) {
      skipped++;
      return;
    }

    const pollsterIdx = columnKinds.indexOf("pollster");
    const pollsterTd = tds.eq(pollsterIdx);
    const pollster = stripFootnotes(pollsterTd.text());
    const link = pollsterTd.find("a").first();
    const href = link.attr("href") ?? null;
    const sourceUrl = href && !href.startsWith("./") && !href.startsWith("#")
      ? href
      : href
        ? `https://en.wikipedia.org/wiki/${href.replace(/^\.\//, "")}`
        : null;

    const sampleIdx = columnKinds.indexOf("sample");
    const sampleSize = sampleIdx !== -1 ? parseNumber(tds.eq(sampleIdx).text()) : null;

    const results: Record<string, number> = {};
    let leaderIdx = 0;
    columnKinds.forEach((kind, i) => {
      if (kind !== "leader") return;
      const leader = leaders[leaderIdx];
      leaderIdx++;
      const value = parseNumber(tds.eq(i).text());
      if (value !== null) results[leader.key] = value;
    });

    if (!pollster) return;
    polls.push({ date: isoDate, dateLabel, pollster, sourceUrl, sampleSize, results });
  });

  polls.sort((a, b) => a.date.localeCompare(b.date));

  return { polls, leaders, skipped };
}

/**
 * Parses the "Leadership approval rating" table specifically: unlike
 * scrapeLeaderTable's single header row, this one has three (base columns;
 * one colspan-3 `<th>` per leader; then a Pos./Neg./Net sub-header per
 * leader), verified directly against the live page's row structure. Only
 * the "Net" sub-column is kept per leader -- the standard single
 * approval-rating figure (positive minus negative).
 */
export function scrapeLeadershipApprovalTable(html: string, headingId: string): ScrapeLeaderTableResult {
  const $ = cheerio.load(html);
  const heading = $(`#${headingId}`);
  if (heading.length === 0) {
    throw new Error(`Could not find #${headingId} heading on the page`);
  }
  const table = heading.closest("section").find("table.wikitable").first();
  if (table.length === 0) {
    throw new Error(`Could not find the table under #${headingId}`);
  }

  const rows = table.find("tr");
  const groupHeaderRow = rows.eq(1);

  const leaders: LeaderColumn[] = [];
  groupHeaderRow.find("th").each((_, el) => {
    const $el = $(el);
    const text = stripFootnotes($el.text());
    const link = $el.find("a").first();
    const key = link.attr("title") || text;
    if (key) leaders.push({ key, shortName: text });
  });

  const polls: ScrapedLeaderRow[] = [];
  let skipped = 0;
  const expectedCols = 3 + leaders.length * 3;

  rows.slice(3).each((_, rowEl) => {
    const tds = $(rowEl).find("td");
    if (tds.length !== expectedCols) {
      skipped++;
      return;
    }

    const dateTd = tds.eq(0);
    const dateLabel = stripFootnotes(dateTd.text());
    const isoDate = parseDateLabelToISO(dateLabel) ?? dateTd.attr("data-sort-value") ?? null;
    if (!isoDate) {
      skipped++;
      return;
    }

    const pollsterTd = tds.eq(1);
    const pollster = stripFootnotes(pollsterTd.text());
    if (!pollster) {
      skipped++;
      return;
    }
    const link = pollsterTd.find("a").first();
    const href = link.attr("href") ?? null;
    const sourceUrl = href && !href.startsWith("./") && !href.startsWith("#")
      ? href
      : href
        ? `https://en.wikipedia.org/wiki/${href.replace(/^\.\//, "")}`
        : null;

    const sampleSize = parseNumber(tds.eq(2).text());

    const results: Record<string, number> = {};
    leaders.forEach((leader, i) => {
      const netIdx = 3 + i * 3 + 2; // each leader is [Pos., Neg., Net] -- Net is the 3rd
      const value = parseNumber(tds.eq(netIdx).text());
      if (value !== null) results[leader.key] = value;
    });

    polls.push({ date: isoDate, dateLabel, pollster, sourceUrl, sampleSize, results });
  });

  polls.sort((a, b) => a.date.localeCompare(b.date));

  return { polls, leaders, skipped };
}
