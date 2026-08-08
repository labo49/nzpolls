/**
 * Builds data/electorates.json: all 71 electorates under the boundaries
 * finalized 8 August 2026 for that year's general election, each with its
 * declared candidates, current MP, and a safe/leaning/toss-up classification
 * derived from whichever of the last 3 general elections (2023, 2020, 2017)
 * still match by name under the new lines.
 *
 * The electorate list, current MP, and candidates all come from Wikipedia's
 * "Candidates in the 2026 New Zealand general election by electorate" page
 * -- the only page that reflects the new boundaries. The historical
 * "Results of the YYYY New Zealand general election" pages predate this
 * redistribution, so an electorate whose name changed (or is genuinely new)
 * won't match any of them by name and is flagged `isNewFor2026` with
 * whatever partial history (often none) still lines up.
 *
 * This is a one-off/occasional build, not part of the daily poll refresh --
 * electorate boundaries and MPs don't change often. Re-run after a
 * candidate-selection update, a by-election, or an MP defection you want
 * reflected.
 *
 * Run with: npx tsx scripts/fetch-electorates.ts
 */
import { writeFile } from "node:fs/promises";
import { installDevProxyIfPresent } from "../lib/wikiPollScraper";
import { parseElectorateCandidatesTable, type CandidateEntry } from "../lib/electorateCandidates";
import {
  cleanElectorateName,
  normalizeElectorateName,
  parseElectorateResultsTable,
  type ElectorateParty,
  type ElectorateResultRow,
} from "../lib/electorateResults";

const OUTPUT_PATH = new URL("../data/electorates.json", import.meta.url);

async function fetchHtml(title: string): Promise<string> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/html/${title}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "nzpolls-scraper (https://github.com/labo49/nzpolls)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

interface HistoryPoint {
  year: number;
  winnerName: string;
  winnerParty: ElectorateParty;
  majority: number | null;
  runnerUpParty: ElectorateParty;
  notional: boolean;
}

interface Electorate {
  name: string;
  seatType: "general" | "maori";
  isNewFor2026: boolean;
  currentMp: { name: string; party: ElectorateParty; note: string | null } | null;
  candidates: CandidateEntry[];
  history: HistoryPoint[];
  classification: "safe" | "leaning" | "tossup";
  classificationParty: ElectorateParty | null;
  trendNote: string;
}

// The 2023 results table has no row for Port Waikato -- the general election
// contest there was cancelled after a candidate's family bereavement, and
// re-run as a stand-alone by-election in February 2024. Scraped separately
// from "2024 Port Waikato by-election". Unlike the 11 electorates the 2026
// boundary review actually renamed or redrew, Port Waikato's boundary is
// unchanged -- this is filling a historical gap, not flagging a new seat.
const PORT_WAIKATO_2023_OVERRIDE: HistoryPoint = {
  year: 2023,
  winnerName: "Andrew Bayly",
  winnerParty: "NAT",
  majority: 11432,
  runnerUpParty: "NZF",
  notional: false,
};

/**
 * Classifies from a majority-of-elections signal, not unanimity: 2020 was a
 * one-off landslide (a COVID-era wave that flipped many normally-National
 * seats to Labour and vice versa in other cycles), so "won every election on
 * record" is too strict a bar -- a seat National held in 2017 and 2023 but
 * lost only in the 2020 wave is a real trend, not a coin flip. The rule:
 * whichever party has the most wins across the elections on record is the
 * "leaning" party, *provided the most recent election agrees with that
 * majority* (if the most recent election just broke from an otherwise
 * consistent history, that's a genuine recent shift, not noise -- toss-up).
 */
function classify(
  history: HistoryPoint[],
  currentMp: { party: ElectorateParty } | null
): { classification: "safe" | "leaning" | "tossup"; classificationParty: ElectorateParty | null; trendNote: string } {
  if (history.length === 0) {
    return {
      classification: "tossup",
      classificationParty: null,
      trendNote:
        "New or substantially redrawn by the boundary review finalized 8 Aug 2026, with no comparable result under these boundaries yet -- treated as a toss-up until real results exist.",
    };
  }

  const sorted = [...history].sort((a, b) => b.year - a.year);
  const mostRecent = sorted[0];

  const flipped = currentMp && currentMp.party !== mostRecent.winnerParty;
  if (flipped) {
    return {
      classification: "tossup",
      classificationParty: null,
      trendNote: `Changed hands since the ${mostRecent.year} general election (won by ${mostRecent.winnerParty}, now held by ${currentMp.party}) -- treated as a toss-up regardless of prior margins.`,
    };
  }

  const wins = new Map<ElectorateParty, number>();
  for (const h of sorted) wins.set(h.winnerParty, (wins.get(h.winnerParty) ?? 0) + 1);
  const maxWins = Math.max(...wins.values());
  const leaders = [...wins.entries()].filter(([, count]) => count === maxWins).map(([p]) => p);
  const hasNoClearMajority = leaders.length > 1 || maxWins <= sorted.length / 2;

  if (hasNoClearMajority) {
    return {
      classification: "tossup",
      classificationParty: null,
      trendNote: `No party has won a majority of the ${sorted.length} elections on record (most recently ${mostRecent.winnerParty}, majority ${(mostRecent.majority ?? 0).toLocaleString()}).`,
    };
  }

  const [majorityParty] = leaders;
  if (mostRecent.winnerParty !== majorityParty) {
    return {
      classification: "tossup",
      classificationParty: null,
      trendNote: `${majorityParty} won more of the last ${sorted.length} elections, but ${mostRecent.winnerParty} won the most recent one (${mostRecent.year}) -- a genuine recent shift, treated as a toss-up.`,
    };
  }

  const margins = sorted.filter((h) => h.winnerParty === majorityParty).map((h) => h.majority ?? 0);
  const recentMargin = mostRecent.majority ?? 0;
  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  const unanimous = maxWins === sorted.length;
  const span = sorted.length === 1 ? "the only election on record" : `${maxWins} of the last ${sorted.length} elections`;
  const note2020 = !unanimous ? " (the exception was the 2020 landslide, an outlier election nationwide)" : "";

  if (unanimous && recentMargin > 8000) {
    return {
      classification: "safe",
      classificationParty: majorityParty,
      trendNote: `${majorityParty} has won ${span}, most recently by ${recentMargin.toLocaleString()} votes -- a safe seat.`,
    };
  }
  if (recentMargin > 2000 || avgMargin > 5000) {
    return {
      classification: "leaning",
      classificationParty: majorityParty,
      trendNote: `${majorityParty} has won ${span}${note2020}, most recently by ${recentMargin.toLocaleString()} votes -- leaning ${majorityParty}, not safe.`,
    };
  }
  return {
    classification: "tossup",
    classificationParty: null,
    trendNote: `${majorityParty} has won ${span}${note2020}, but only by ${recentMargin.toLocaleString()} votes most recently -- a toss-up.`,
  };
}

async function main() {
  await installDevProxyIfPresent();

  const [htmlCandidates, html2023, html2020, html2017] = await Promise.all([
    fetchHtml("Candidates_in_the_2026_New_Zealand_general_election_by_electorate"),
    fetchHtml("Results_of_the_2023_New_Zealand_general_election"),
    fetchHtml("Results_of_the_2020_New_Zealand_general_election"),
    fetchHtml("Results_of_the_2017_New_Zealand_general_election"),
  ]);

  const candidateRows = parseElectorateCandidatesTable(htmlCandidates);
  const rows2023 = parseElectorateResultsTable(html2023, "Electorate_results");
  const rows2020 = parseElectorateResultsTable(html2020, "Electorate_vote");
  const rows2017 = parseElectorateResultsTable(html2017, "Electorate_results");

  const byNormalized2023 = new Map(rows2023.map((r) => [normalizeElectorateName(r.electorateName), r]));
  const byNormalized2020 = new Map(rows2020.map((r) => [normalizeElectorateName(r.electorateName), r]));
  const byNormalized2017 = new Map(rows2017.map((r) => [normalizeElectorateName(r.electorateName), r]));

  const toPoint = (r: ElectorateResultRow, year: number): HistoryPoint => ({
    year,
    winnerName: r.winnerName,
    winnerParty: r.winnerParty,
    majority: r.majority,
    runnerUpParty: r.runnerUpParty,
    notional: r.notional,
  });

  const electorates: Electorate[] = candidateRows.map((row) => {
    const key = normalizeElectorateName(row.electorateName);
    const history: HistoryPoint[] = [];

    const r2023 = byNormalized2023.get(key);
    if (r2023) history.push(toPoint(r2023, 2023));

    const r2020 = byNormalized2020.get(key);
    if (r2020) history.push(toPoint(r2020, 2020));

    const r2017 = byNormalized2017.get(key);
    if (r2017 && !r2020?.notional) history.push(toPoint(r2017, 2017));

    // Not matched under this name in the 2023 results -- either genuinely
    // new, or renamed/redrawn by the review finalized 8 Aug 2026.
    const isNewFor2026 = !r2023;

    const incumbent = row.candidates.find((c) => c.isIncumbent) ?? null;
    const currentMp = incumbent
      ? { name: incumbent.name, party: incumbent.partyCode, note: incumbent.notes }
      : null;

    const { classification, classificationParty, trendNote } = classify(history, currentMp);

    return {
      name: cleanElectorateName(row.electorateName),
      seatType: row.seatType,
      isNewFor2026,
      currentMp,
      candidates: row.candidates,
      history,
      classification,
      classificationParty,
      trendNote,
    };
  });

  // Port Waikato: inject the by-election result as its "2023" data point --
  // its boundary is unchanged, this is a historical-data gap, not a 2026
  // redistribution flag.
  const portWaikato = electorates.find((e) => normalizeElectorateName(e.name) === "port waikato");
  if (portWaikato && !portWaikato.history.some((h) => h.year === 2023)) {
    portWaikato.history = [PORT_WAIKATO_2023_OVERRIDE, ...portWaikato.history];
    portWaikato.isNewFor2026 = false;
    const recomputed = classify(portWaikato.history, portWaikato.currentMp);
    Object.assign(portWaikato, recomputed);
  }

  electorates.sort((a, b) => a.name.localeCompare(b.name));

  const generalCount = electorates.filter((e) => e.seatType === "general").length;
  const maoriCount = electorates.filter((e) => e.seatType === "maori").length;
  const noIncumbent = electorates.filter((e) => e.currentMp === null).length;
  console.log(
    `Parsed ${electorates.length} electorates (${generalCount} general, ${maoriCount} Māori). ` +
      `${electorates.filter((e) => e.isNewFor2026).length} flagged as new/redrawn for 2026, ` +
      `${noIncumbent} with no incumbent flagged yet.`
  );

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        sources: [
          "https://en.wikipedia.org/wiki/Candidates_in_the_2026_New_Zealand_general_election_by_electorate",
          "https://en.wikipedia.org/wiki/Results_of_the_2023_New_Zealand_general_election",
          "https://en.wikipedia.org/wiki/Results_of_the_2020_New_Zealand_general_election",
          "https://en.wikipedia.org/wiki/Results_of_the_2017_New_Zealand_general_election",
          "https://en.wikipedia.org/wiki/2024_Port_Waikato_by-election",
        ],
        electorates,
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );
  console.log(`Wrote ${electorates.length} electorates to data/electorates.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
