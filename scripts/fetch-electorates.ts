/**
 * Builds data/electorates.json: all 71 current electorates, their current
 * MP/party, and a safe/leaning/toss-up classification derived from the last
 * 2-3 general elections (2023, 2020, 2017), scraped from Wikipedia's
 * "Results of the YYYY New Zealand general election" pages.
 *
 * This is a one-off/occasional build, not part of the daily poll refresh --
 * electorate boundaries and MPs don't change often. Re-run after a
 * redistribution, a by-election, or an MP defection you want reflected.
 *
 * Run with: npx tsx scripts/fetch-electorates.ts
 */
import { writeFile } from "node:fs/promises";
import {
  installDevProxyIfPresent,
} from "../lib/wikiPollScraper";
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
  isNewSeat: boolean;
  currentMp: { name: string; party: ElectorateParty; note: string | null };
  history: HistoryPoint[];
  classification: "safe" | "leaning" | "tossup";
  classificationParty: ElectorateParty | null;
  trendNote: string;
}

// Post-2023 changes visible in the scraped 2026-polling-page event notes
// (lib/electorates.ts documents the same two facts for the seat model) --
// not derivable from the results pages themselves, which only go up to 2023.
const CURRENT_MP_OVERRIDES: Record<string, { name: string; party: ElectorateParty; note: string }> = {
  "tamaki makaurau": {
    name: "Oriini Kaipara",
    party: "TPM",
    note:
      "Won the Tāmaki Makaurau by-election in September 2025, succeeding the party's own Takutai Tarsh Kemp -- the 2023 general election winner -- not a gain from another party.",
  },
  "te tai tokerau": {
    name: "Mariameno Kapa-Kingi",
    party: "OTH",
    note:
      "Won the seat for Te Pāti Māori in 2023, but left the party in May 2026 to start her own Te Tai Tokerau Party. Still holds the seat.",
  },
};

// The 2023 results table has no row for Port Waikato -- the general election
// contest there was cancelled after a candidate's family bereavement, and
// re-run as a stand-alone by-election in February 2024. Scraped separately
// from "2024 Port Waikato by-election".
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
 * whichever party has the most wins across the 2-3 elections on record is
 * the "leaning" party, *provided the most recent election agrees with that
 * majority* (if the most recent election just broke from an otherwise
 * consistent history, that's a genuine recent shift, not noise -- toss-up).
 */
function classify(
  history: HistoryPoint[],
  currentMp: { party: ElectorateParty }
): { classification: "safe" | "leaning" | "tossup"; classificationParty: ElectorateParty | null; trendNote: string } {
  const sorted = [...history].sort((a, b) => b.year - a.year);
  const mostRecent = sorted[0];

  const flipped = mostRecent && currentMp.party !== mostRecent.winnerParty;
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

  const [html2023, html2020, html2017] = await Promise.all([
    fetchHtml("Results_of_the_2023_New_Zealand_general_election"),
    fetchHtml("Results_of_the_2020_New_Zealand_general_election"),
    fetchHtml("Results_of_the_2017_New_Zealand_general_election"),
  ]);

  const rows2023 = parseElectorateResultsTable(html2023, "Electorate_results");
  const rows2020 = parseElectorateResultsTable(html2020, "Electorate_vote");
  const rows2017 = parseElectorateResultsTable(html2017, "Electorate_results");

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

  const electorates: Electorate[] = [];

  for (const row2023 of rows2023) {
    const key = normalizeElectorateName(row2023.electorateName);
    const history: HistoryPoint[] = [toPoint(row2023, 2023)];

    const r2020 = byNormalized2020.get(key);
    if (r2020) history.push(toPoint(r2020, 2020));

    const r2017 = byNormalized2017.get(key);
    const isNewSeat = !r2017 || (r2020?.notional ?? false);
    if (r2017 && !r2020?.notional) history.push(toPoint(r2017, 2017));

    const override = CURRENT_MP_OVERRIDES[key];
    const currentMp = override
      ? { name: override.name, party: override.party, note: override.note }
      : { name: row2023.winnerName, party: row2023.winnerParty, note: null };

    const { classification, classificationParty, trendNote } = classify(history, currentMp);

    electorates.push({
      name: cleanElectorateName(row2023.electorateName),
      seatType: row2023.seatType,
      isNewSeat,
      currentMp,
      history,
      classification,
      classificationParty,
      trendNote: isNewSeat
        ? `New or substantially redrawn for the 2023 election, so only ${history.length} comparable result${history.length === 1 ? "" : "s"} exist${history.length === 1 ? "s" : ""} (2023${history.some((h) => h.notional) ? " + a notional 2020 recalculation under today's boundaries" : ""}). ${trendNote}`
        : trendNote,
    });
  }

  // Port Waikato: inject the by-election result as its "2023" data point.
  const portWaikato = electorates.find((e) => normalizeElectorateName(e.name) === "port waikato");
  if (portWaikato) {
    portWaikato.history = portWaikato.history.map((h) =>
      h.year === 2023 ? { ...PORT_WAIKATO_2023_OVERRIDE } : h
    );
    if (!portWaikato.history.some((h) => h.year === 2023)) {
      portWaikato.history.unshift(PORT_WAIKATO_2023_OVERRIDE);
    }
    const recomputed = classify(portWaikato.history, portWaikato.currentMp);
    Object.assign(portWaikato, recomputed);
  }

  electorates.sort((a, b) => a.name.localeCompare(b.name));

  const generalCount = electorates.filter((e) => e.seatType === "general").length;
  const maoriCount = electorates.filter((e) => e.seatType === "maori").length;
  console.log(
    `Parsed ${electorates.length} electorates (${generalCount} general, ${maoriCount} Māori). ` +
      `${electorates.filter((e) => e.isNewSeat).length} flagged as new/redrawn.`
  );

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        sources: [
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
