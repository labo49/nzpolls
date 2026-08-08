import * as cheerio from "cheerio";
import type { PartyCode } from "./parties";

export type ElectorateParty = PartyCode | "OTH";

export interface ElectorateResultRow {
  electorateName: string;
  seatType: "general" | "maori";
  winnerName: string;
  winnerParty: ElectorateParty;
  majority: number | null;
  runnerUpName: string;
  runnerUpParty: ElectorateParty;
  /** True when this row is a post-redistribution notional recalculation of an
   * earlier election under today's boundaries (seen on the 2020 results page
   * after the pre-2023 redistribution), not the real historical contest. */
  notional: boolean;
}

function stripFootnotes(text: string): string {
  return text.replace(/\[[a-z0-9]+\]/gi, "").trim();
}

/** Strips the Wikipedia disambiguator for a clean display name, e.g.
 * "Auckland Central (New Zealand electorate)" -> "Auckland Central". */
export function cleanElectorateName(raw: string): string {
  return stripFootnotes(raw).replace(/\s*\(New Zealand electorate\)\s*/i, "").trim();
}

/** Normalizes for cross-year name matching: lowercases and drops macrons so
 * e.g. "Whangarei" / "Whangārei" match despite the spelling update. */
export function normalizeElectorateName(raw: string): string {
  return cleanElectorateName(raw)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Hex colors observed on Wikipedia's NZ election-results tables, mapped to
// this app's party codes. Includes minor/historical parties (Mana, TOP) and
// a catch-all for independents -- both fold into "OTH" here, same as the
// polling data's "Others" column.
const COLOR_TO_PARTY: Record<string, ElectorateParty> = {
  "#00529F": "NAT",
  "#D82A20": "LAB",
  "#098137": "GRN",
  "#008000": "GRN",
  "#FDE401": "ACT",
  "#000000": "NZF",
  "#B2001A": "TPM",
  "#09B598": "TOP",
  "#770808": "OTH", // Mana Party (Hone Harawira era)
  "#DCDCDC": "OTH", // independents
};

function colorToParty(hex: string | null): ElectorateParty {
  if (!hex) return "OTH";
  return COLOR_TO_PARTY[hex.toUpperCase()] ?? "OTH";
}

function extractColor(style: string | undefined): string | null {
  if (!style) return null;
  const m = style.match(/background:\s*(#[0-9A-Fa-f]{3,6})/);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Parses a Wikipedia "Results of the YYYY New Zealand general election"
 * electorate-by-electorate table. Handles all three row shapes actually
 * observed: 8 tds (incumbent re-elected, one merged name), 9 tds (no
 * incumbent -- a genuinely new electorate, or the "New electorate" notional
 * placeholder used on the 2020 page for seats introduced by the later
 * redistribution), and 10 tds (incumbent lost, separate incumbent/winner).
 */
export function parseElectorateResultsTable(html: string, sectionId: string): ElectorateResultRow[] {
  const $ = cheerio.load(html);
  const heading = $(`#${sectionId}`);
  if (heading.length === 0) {
    throw new Error(`Could not find #${sectionId} heading on the page`);
  }
  const table = heading.closest("section").find("table.wikitable").first();
  if (table.length === 0) {
    throw new Error(`Could not find the results table under #${sectionId}`);
  }

  const results: ElectorateResultRow[] = [];
  let seatType: "general" | "maori" = "general";

  table
    .find("tr")
    .slice(1)
    .each((_, el) => {
      const tds = $(el).find("td");
      const n = tds.length;

      if (n === 1) {
        // Subsection divider, e.g. "Māori electorates".
        const label = stripFootnotes($(tds[0]).text()).toLowerCase();
        if (label.includes("maori") || label.includes("māori")) seatType = "maori";
        return;
      }
      if (n !== 8 && n !== 9 && n !== 10) return; // e.g. the cancelled-poll Port Waikato row

      const electorateName = cleanElectorateName(
        tds.eq(0).find("a").first().attr("title") || tds.eq(0).text()
      );
      const notional = n === 9 && stripFootnotes(tds.eq(1).text()).toLowerCase() === "new electorate";
      const skip = n === 8 ? 0 : n === 9 ? 1 : 2;

      const winnerColor = extractColor(tds.eq(1 + skip).attr("style"));
      const winnerName = stripFootnotes(tds.eq(2 + skip).text());
      const majorityText = stripFootnotes(tds.eq(3 + skip).text()).replace(/,/g, "");
      const majority = majorityText && /^\d+$/.test(majorityText) ? Number(majorityText) : null;
      const runnerUpColor = extractColor(tds.eq(4 + skip).attr("style"));
      const runnerUpName = stripFootnotes(tds.eq(5 + skip).text());

      if (!electorateName || !winnerName) return;

      results.push({
        electorateName,
        seatType,
        winnerName,
        winnerParty: colorToParty(winnerColor),
        majority,
        runnerUpName,
        runnerUpParty: colorToParty(runnerUpColor),
        notional,
      });
    });

  return results;
}
