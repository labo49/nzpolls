import * as cheerio from "cheerio";
import type { PartyCode } from "./parties";

// Spelling used in the results page's own party-vote pie-chart legend --
// distinct from the candidates-page party labels (electorateCandidates.ts
// has its own copy for that page's own spellings, e.g. "NZ First" there vs
// here too, but "Māori" here for Te Pāti Māori where the candidates page
// says "Te Pāti Māori" outright).
const LEGEND_LABEL_TO_CODE: Record<string, PartyCode> = {
  national: "NAT",
  labour: "LAB",
  green: "GRN",
  act: "ACT",
  "nz first": "NZF",
  opportunity: "TOP",
  "māori": "TPM",
};

export interface NationalPartyVote {
  results: Partial<Record<PartyCode, number>>;
  /** Share attributed to parties below the tracked set (OTH on every other
   * page in this app), read from the legend's own "Other" slice rather than
   * computed as a remainder, so it matches what the page itself reports. */
  othersPct: number;
}

/**
 * Parses the national party-vote result off a "Results of the YYYY New
 * Zealand general election" page's results pie chart -- Wikipedia renders
 * it as a CSS-only chart (a `{{Pie chart}}`-style template, clip-path
 * slices, no SVG or <img>) with the actual figures only in its
 * `.smooth-pie-legend` list, e.g. "National (29.2%)". There's no plain
 * wikitable for this on the page (confirmed against the live 2026 page --
 * only two: Electorate_results and the MPs-who-lost-their-seats table),
 * unlike the party-vote figures on `Results of the 2023 ...`, which came
 * from the Table_of_polls-shaped table scrapeWikiPollTable already reads.
 */
export function scrapeNationalPartyVoteLegend(html: string): NationalPartyVote {
  const $ = cheerio.load(html);
  const legend = $(".smooth-pie-legend").first();
  if (legend.length === 0) {
    throw new Error("Could not find the party-vote pie chart legend on the results page");
  }

  const results: Partial<Record<PartyCode, number>> = {};
  let othersPct = 0;

  legend.find("li").each((_, el) => {
    const text = $(el).text().trim();
    const match = text.match(/^(.+?)\s*\(([\d.]+)%\)$/);
    if (!match) return;
    const [, rawLabel, pctText] = match;
    const pct = Number(pctText);
    if (!Number.isFinite(pct)) return;

    const label = rawLabel.trim().toLowerCase();
    if (label === "other") {
      othersPct = pct;
      return;
    }
    const code = LEGEND_LABEL_TO_CODE[label];
    if (code) results[code] = pct;
  });

  return { results, othersPct };
}
