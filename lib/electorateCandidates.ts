import * as cheerio from "cheerio";
import type { PartyCode } from "./parties";
import type { ElectorateParty } from "./electorateResults";

export interface CandidateEntry {
  partyCode: ElectorateParty;
  /** Party name exactly as shown on the source page, e.g. "New Conservative" -- kept even for minor parties folded into "OTH" so the UI can still show who they actually are. */
  partyLabel: string;
  name: string;
  listNumber: number | null;
  notes: string | null;
  /** Blue-shaded row: the sitting MP for this (possibly redrawn) electorate. */
  isIncumbent: boolean;
  /** Pink-shaded row: currently a list MP, standing here for an electorate seat. */
  isCurrentListMp: boolean;
  /** Yellow-shaded row: a retiring MP not seeking re-election. */
  isRetiringMp: boolean;
}

export interface ElectorateCandidatesRow {
  /** Exactly as it appears in the page's own table of contents / heading. */
  electorateName: string;
  seatType: "general" | "maori";
  candidates: CandidateEntry[];
}

function stripFootnotes(text: string): string {
  return text.replace(/\[[a-z0-9]+\]/gi, "").trim();
}

// The page identifies parties by name, not a stable color (unlike the
// results pages -- e.g. this page uses #00ede1 for TOP, the results pages
// use #09B598), so match on the party link text instead.
const PARTY_LABEL_TO_CODE: Record<string, PartyCode> = {
  labour: "LAB",
  national: "NAT",
  act: "ACT",
  green: "GRN",
  "nz first": "NZF",
  "new zealand first": "NZF",
  "te pāti māori": "TPM",
  "māori party": "TPM",
  opportunity: "TOP",
};

function partyCodeFor(label: string): ElectorateParty {
  return PARTY_LABEL_TO_CODE[label.trim().toLowerCase()] ?? "OTH";
}

function hasShade(style: string, hex: string): boolean {
  return new RegExp(`background(?:-color)?:\\s*${hex}`, "i").test(style);
}

/**
 * Parses Wikipedia's "Candidates in the 2026 New Zealand general election by
 * electorate" page: one table per electorate (h3 heading), each row a
 * declared candidate. Candidate selection is ongoing (nominations don't
 * close until 8 Oct 2026), so most electorates are partially populated --
 * that's the source data, not a parsing gap.
 */
export function parseElectorateCandidatesTable(html: string): ElectorateCandidatesRow[] {
  const $ = cheerio.load(html);
  const rows: ElectorateCandidatesRow[] = [];
  let seatType: "general" | "maori" = "general";

  $("h2, h3").each((_, el) => {
    const $el = $(el);
    const id = $el.attr("id") ?? "";

    if ($el.is("h2")) {
      if (id === "Māori_electorates") seatType = "maori";
      return;
    }
    if (id === "References") return;

    const table = $el.closest("section").find("table").first();
    if (table.length === 0) return;

    const candidates: CandidateEntry[] = [];
    table.find("tr.vcard").each((_, tr) => {
      const $tr = $(tr);
      const partyLabel = stripFootnotes($tr.find("td.org").text());
      const name = stripFootnotes($tr.find("td.fn").text());
      if (!partyLabel || !name) return;

      const tds = $tr.find("td");
      const notes = stripFootnotes(tds.eq(2).text());
      const listText = stripFootnotes(tds.eq(3).text());
      const listNumber = /^\d+$/.test(listText) ? Number(listText) : null;
      const style = $tr.find("td.fn").attr("style") || $tr.find("td.org").attr("style") || "";

      candidates.push({
        partyCode: partyCodeFor(partyLabel),
        partyLabel,
        name,
        listNumber,
        notes: notes || null,
        isIncumbent: hasShade(style, "#CFF"),
        isCurrentListMp: hasShade(style, "#FDD"),
        isRetiringMp: hasShade(style, "#FE9"),
      });
    });

    rows.push({ electorateName: stripFootnotes($el.text()), seatType, candidates });
  });

  return rows;
}
