import * as cheerio from "cheerio";
import { HEADER_TO_CODE, parseDateLabelToISO, parseNumber, stripFootnotes } from "./wikiPollScraper";
import type { ElectorateParty } from "./electorateResults";
import { normalizeElectorateName } from "./electorateResults";

export interface SeatPollValue {
  /** Null when the column doesn't map to a tracked party code -- e.g. the
   * "TTT" (Te Tai Tokerau Party) column on Te Tai Tokerau's table, a new
   * 2026 party with no PartyCode of its own. Kept (not dropped) so a caller
   * computing "who's leading" can tell a genuine tracked-party lead apart
   * from one that's actually held by an untracked party -- silently
   * comparing only the mapped columns would misattribute that electorate's
   * real frontrunner to whichever tracked party happens to poll highest. */
  code: ElectorateParty | null;
  label: string;
  value: number;
}

export interface ElectorateSeatPoll {
  date: string;
  dateLabel: string;
  pollster: string;
  sourceUrl: string | null;
  sampleSize: number | null;
  partyVote: SeatPollValue[] | null;
  electorateVote: SeatPollValue[] | null;
}

function hrefToSourceUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  if (!href.startsWith("./") && !href.startsWith("#")) return href;
  return `https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_New_Zealand_general_election${href.startsWith("#") ? href : ""}`;
}

/**
 * Parses the per-electorate seat-poll tables under the "Electorate polling"
 * heading of the national opinion-polling page -- each table is a direct
 * sibling of its electorate's own h4 heading (e.g. "Auckland Central",
 * "Te Tai Tokerau"), with rows shaped like:
 *   | Date (rowspan 2) | Pollster (rowspan 2) | Sample (rowspan 2) | "Party Vote"     | <party columns...> | Lead |
 *   |                                                              | "Electorate vote"| <party columns...> | Lead |
 * i.e. up to two rows per poll sharing one rowspan'd date/pollster/sample --
 * detected by td count (a full row has one per header; a continuation row
 * is short exactly the 3 rowspan'd cells) rather than assuming every poll
 * reports both rows, since a poll with only one type produces a single full
 * row and no continuation.
 */
export function scrapeElectoratePolls(html: string): Map<string, ElectorateSeatPoll[]> {
  const $ = cheerio.load(html);
  const byElectorate = new Map<string, ElectorateSeatPoll[]>();

  const section = $("#Electorate_polling").closest("section");
  if (section.length === 0) return byElectorate;

  section.find("h4").each((_, h4el) => {
    const $h4 = $(h4el);
    const electorateKey = normalizeElectorateName(stripFootnotes($h4.text()));

    let next = $h4.next();
    let table: cheerio.Cheerio<import("domhandler").Element> | null = null;
    for (let hops = 0; hops < 6 && next.length; hops++) {
      if (next.is("table")) {
        table = next;
        break;
      }
      next = next.next();
    }
    if (!table) return;

    const headerCells = table.find("tr").first().find("th");
    const headerTexts = headerCells.toArray().map((el) => $(el).text().trim());
    const headerCount = headerTexts.length;
    // Column 3 (0-indexed) is the blank header above the "Party Vote" /
    // "Electorate vote" row-type label; columns 4..headerCount-2 are party
    // columns; the last column is "Lead" (ignored -- the leading party and
    // margin are derived from the values directly, not this column's own
    // formatting).
    const partyColumns = headerTexts.slice(4, headerCount - 1).map((text) => ({
      label: text,
      code: (HEADER_TO_CODE[text.toUpperCase()] as ElectorateParty | undefined) ?? null,
    }));

    const polls: ElectorateSeatPoll[] = [];
    let pending: { date: string; dateLabel: string; pollster: string; sourceUrl: string | null; sampleSize: number | null } | null = null;

    table.find("tr").slice(1).each((_, rowEl) => {
      const tds = $(rowEl).find("td");
      const isFullRow = tds.length === headerCount;
      const isContinuationRow = tds.length === headerCount - 3;
      if (!isFullRow && !isContinuationRow) return;

      let labelCell;
      let valueCells;
      if (isFullRow) {
        const dateLabel = stripFootnotes(tds.eq(0).text());
        const isoDate = parseDateLabelToISO(dateLabel) ?? tds.eq(0).attr("data-sort-value") ?? null;
        if (!isoDate) return;
        const pollsterTd = tds.eq(1);
        pending = {
          date: isoDate,
          dateLabel,
          pollster: stripFootnotes(pollsterTd.text()),
          sourceUrl: hrefToSourceUrl(pollsterTd.find("a").first().attr("href")),
          sampleSize: parseNumber(tds.eq(2).text()),
        };
        labelCell = tds.eq(3);
        valueCells = tds.slice(4, 4 + partyColumns.length);
      } else {
        if (!pending) return; // continuation row with no preceding full row -- malformed, skip
        labelCell = tds.eq(0);
        valueCells = tds.slice(1, 1 + partyColumns.length);
      }

      const rowType = stripFootnotes(labelCell.text()).toLowerCase();
      const values: SeatPollValue[] = partyColumns.map((col, i) => ({
        code: col.code,
        label: col.label,
        value: parseNumber(valueCells.eq(i).text()) ?? NaN,
      })).filter((v) => !Number.isNaN(v.value));
      if (values.length === 0) return;

      let poll = polls.find((p) => p.dateLabel === pending!.dateLabel && p.pollster === pending!.pollster);
      if (!poll) {
        poll = { ...pending, partyVote: null, electorateVote: null };
        polls.push(poll);
      }
      if (rowType.startsWith("party")) poll.partyVote = values;
      else if (rowType.startsWith("electorate")) poll.electorateVote = values;
    });

    if (polls.length > 0) {
      polls.sort((a, b) => a.date.localeCompare(b.date));
      byElectorate.set(electorateKey, polls);
    }
  });

  return byElectorate;
}
