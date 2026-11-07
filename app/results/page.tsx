import CreatedByLine from "@/components/CreatedByLine";
import ElectorateResultsTable from "@/components/ElectorateResultsTable";
import LatestSnapshot from "@/components/LatestSnapshot";
import OverhangSummary from "@/components/OverhangSummary";
import ScenarioTable from "@/components/ScenarioTable";
import SeatsTable from "@/components/SeatsTable";
import { computeElectionScenarios, findClosestRaces } from "@/lib/electionScenarios";
import { pageMetadata } from "@/lib/site";
import electionResultData from "@/data/electionResult.json";
import type { ElectorateResultRow } from "@/lib/electorateResults";
import type { PartyCode } from "@/lib/parties";

const TOTAL_ELECTORATES = 71;
const CLOSE_RACE_COUNT = 5;

export const metadata = pageMetadata(
  "2026 Election Result",
  "The preliminary 2026 general election result -- ordinary votes only, before special votes are counted -- with scenarios for how the 5 closest electorate races could swing the overall outcome.",
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

  const closeRaces = findClosestRaces(data.electorates, CLOSE_RACE_COUNT);
  const scenarios = computeElectionScenarios(data.partyVote.results, data.electorates, closeRaces);
  // N=0 close races reassigned -- i.e. every electorate at its real preliminary winner.
  const baseline = scenarios[scenarios.length - 1];

  const snapshotPoint = { date: data.fetchedAt, pollCount: data.electorates.length, results: data.partyVote.results };
  const closeRaceNames = new Set(closeRaces.map((r) => r.electorateName));

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
        <SeatsTable seats={baseline.seats} />
        <div className="mt-3">
          <OverhangSummary seats={baseline.seats} />
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Modified Sainte-Laguë allocation over the real preliminary party vote and electorate wins above &mdash; not a
          poll-based estimate. * marks an overhang seat. {TOTAL_ELECTORATES - data.electorates.length} electorate
          {TOTAL_ELECTORATES - data.electorates.length === 1 ? "" : "s"} not yet reported is excluded until it
          declares.
        </p>
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

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          If the {CLOSE_RACE_COUNT} closest races all break National&apos;s way
        </h2>
        <p className="mb-3 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          The {CLOSE_RACE_COUNT} electorates decided by the smallest margins &mdash;{" "}
          {closeRaces.map((r, i) => (
            <span key={r.electorateName}>
              {r.electorateName} ({r.majority.toLocaleString()} votes)
              {i < closeRaces.length - 1 ? ", " : ""}
            </span>
          ))}{" "}
          &mdash; are the ones most likely to flip once special votes are counted. Each row below is a hypothetical:
          National winning anywhere from all {CLOSE_RACE_COUNT} down to none of them, with every other electorate and
          the national party vote held at today&apos;s real preliminary result, to isolate exactly what these few
          seats could change about the overall outcome. Two of the {CLOSE_RACE_COUNT} are already National&apos;s in
          the preliminary count, so some rows land on the same total as the one above them &mdash; winning a seat you
          already hold doesn&apos;t change anything.
        </p>
        <ScenarioTable scenarios={scenarios} />
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
