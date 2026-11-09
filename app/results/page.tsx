import CreatedByLine from "@/components/CreatedByLine";
import ElectorateResultsTable from "@/components/ElectorateResultsTable";
import LatestSnapshot from "@/components/LatestSnapshot";
import OverhangSummary from "@/components/OverhangSummary";
import ScenarioGroupSection from "@/components/ScenarioGroupSection";
import SeatsChart from "@/components/SeatsChart";
import SeatsTable from "@/components/SeatsTable";
import { computeBlocSeats } from "@/lib/blocs";
import { computeBaselineSeats, computeElectionScenarios } from "@/lib/electionScenarios";
import { houseSize, majorityThreshold } from "@/lib/seats";
import { pageMetadata } from "@/lib/site";
import { nationalTurnoutEstimate } from "@/lib/turnoutEstimates";
import electionResultData from "@/data/electionResult.json";
import type { ElectorateResultRow } from "@/lib/electorateResults";
import type { PartyCode } from "@/lib/parties";

const TOTAL_ELECTORATES = 71;

// The outgoing Parliament's final seat allocation from the 2023 general
// election's official declared result (123 seats, 3 of them Te Pāti Māori
// overhang) -- a fixed historical fact, shown for comparison against the
// new preliminary totals below, not derived from scraped data.
const OUTGOING_PARLIAMENT_SEATS: Partial<Record<PartyCode, number>> = {
  NAT: 49,
  LAB: 34,
  GRN: 15,
  ACT: 11,
  NZF: 8,
  TPM: 6,
};

export const metadata = pageMetadata(
  "2026 Election Result",
  "The preliminary 2026 general election result -- ordinary votes only, before special votes are counted -- with scenarios for how close electorates and party-vote shifts could swing the overall outcome.",
  "/results"
);

export default function ResultsPage() {
  const data = electionResultData as {
    fetchedAt: string;
    source: string;
    preliminary: boolean;
    officialDeclarationDate: string;
    partyVote: { results: Partial<Record<PartyCode, number>>; othersPct: number };
    electorates: ElectorateResultRow[];
  };

  const baselineSeats = computeBaselineSeats(data.partyVote.results, data.electorates);
  const baseline = {
    seats: baselineSeats,
    houseSize: houseSize(baselineSeats),
    majorityThreshold: majorityThreshold(baselineSeats),
  };
  const { groups, compound, highlightedElectorates } = computeElectionScenarios(data.partyVote.results, data.electorates);
  const nationalTurnout = nationalTurnoutEstimate();
  const blocSeats = computeBlocSeats(baseline.seats);

  const snapshotPoint = { date: data.fetchedAt, pollCount: data.electorates.length, results: data.partyVote.results };
  const closeRaceNames = new Set(highlightedElectorates);

  const missingCount = TOTAL_ELECTORATES - data.electorates.length;
  // Rangitīkei is the one electorate Wikipedia's table hasn't added yet (an
  // uncontested safe National seat -- see data/electorates.json) -- named
  // explicitly below when it's the only one outstanding, since that also
  // explains why some outlets already report 42 seats for National here
  // rather than the 41 this page shows until that row lands.
  const missingNote =
    missingCount === 1 && !data.electorates.some((e) => e.electorateName === "Rangitīkei")
      ? "Rangitīkei (an uncontested safe National seat not yet added to the source table)"
      : null;

  const fetchedAt = new Date(data.fetchedAt).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const officialDate = new Date(data.officialDeclarationDate).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          2026 Election Result
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Preliminary result &mdash; ordinary votes only ({data.electorates.length} of {TOTAL_ELECTORATES} electorates
          declared). Special votes (historically 15&ndash;20% of the total) aren&apos;t counted yet; the Electoral
          Commission declares the official result on {officialDate}.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Party vote
        </h2>
        <LatestSnapshot point={snapshotPoint} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Seats (current preliminary result)
        </h2>
        <div className="grid gap-6 sm:grid-cols-[1fr_280px]">
          <div>
            <SeatsTable seats={baseline.seats} previousSeats={OUTGOING_PARLIAMENT_SEATS} previousLabel="2023" />
            <div className="mt-3">
              <OverhangSummary seats={baseline.seats} />
            </div>
          </div>
          <SeatsChart
            blocSeats={blocSeats}
            houseSize={baseline.houseSize}
            majority={baseline.majorityThreshold}
            footnote={
              <>
                Bloc seats (out of {baseline.houseSize}) from today&apos;s real preliminary result above, using New
                Zealand&apos;s modified Sainte-Laguë MMP allocation &mdash; not a poll-based projection.
              </>
            }
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Modified Sainte-Laguë allocation over the real preliminary party vote and electorate wins above &mdash; not a
          poll-based estimate. * marks an overhang seat. 2023 is each party&apos;s seat count in the outgoing
          Parliament, for comparison. {missingCount} electorate{missingCount === 1 ? "" : "s"} not yet reported
          {missingNote ? ` (${missingNote})` : ""} is excluded until it declares.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          How the 27 Nov official count could move these numbers
        </h2>
        <p className="mb-5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Nationally, {nationalTurnout.votes.toLocaleString()} of {nationalTurnout.enrolled.toLocaleString()} enrolled
          voters ({nationalTurnout.percSoFar.toFixed(1)}%) have been counted so far. Applying 2023&apos;s own
          preliminary-to-final growth to that pace projects roughly{" "}
          {Math.round(nationalTurnout.projectedOutstanding).toLocaleString()} votes still to come by 27 Nov &mdash;
          higher than the ~400,000 special votes commonly cited, likely because that figure covers specials alone
          while this also counts ordinary votes still being processed; treat it as a rough estimate, not an official
          count. Those votes won&apos;t move every electorate or the party vote evenly, so below are the distinct
          ways the final count could shift today&apos;s preliminary numbers &mdash; each modeled on its own, holding
          everything else at today&apos;s real result. Any combination of them could happen at once; this
          isn&apos;t a prediction, just a map of what to watch for.
        </p>
        {groups.map((group) => (
          <ScenarioGroupSection key={group.key} group={group} />
        ))}
        {compound && (
          <div className="mt-6 rounded-lg border border-dashed border-black/15 p-4 dark:border-white/15">
            <ScenarioGroupSection group={compound} />
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Electorate results
        </h2>
        <ElectorateResultsTable
          electorates={data.electorates}
          closeRaceNames={closeRaceNames}
          totalElectorates={TOTAL_ELECTORATES}
        />
      </section>

      <footer className="mt-10 border-t border-black/10 pt-4 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
        <p>
          Source:{" "}
          <a
            href={data.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600"
          >
            Wikipedia &mdash; Results of the 2026 New Zealand general election
          </a>
          . Last refreshed {fetchedAt}. This page will keep updating as more electorates are declared and as special
          votes are counted, through the official declaration on {officialDate}.
        </p>
        <CreatedByLine />
      </footer>
    </main>
  );
}
