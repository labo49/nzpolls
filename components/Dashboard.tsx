"use client";

import { useEffect, useMemo, useState } from "react";
import BlocChart from "@/components/BlocChart";
import ElectorateEditor from "@/components/ElectorateEditor";
import LatestSnapshot from "@/components/LatestSnapshot";
import PollChart from "@/components/PollChart";
import PollsTable from "@/components/PollsTable";
import PollsterFilter from "@/components/PollsterFilter";
import RecencyFilter, { type RecencyLimit } from "@/components/RecencyFilter";
import SeatsChart from "@/components/SeatsChart";
import SeatsTable from "@/components/SeatsTable";
import { computeBlocs, computeBlocSeats } from "@/lib/blocs";
import { ELECTORATE_SEATS, type ElectorateSeatMap } from "@/lib/electorates";
import {
  clearElectorateOverride,
  loadElectorateOverride,
  saveElectorateOverride,
} from "@/lib/electorateOverride";
import type { ElectorateOutlookSummary } from "@/lib/electorateOutlook";
import { actualPolls, computePollOfPolls, isElectionResult } from "@/lib/pollOfPolls";
import { getReliability } from "@/lib/reliability";
import { computeSeats, houseSize, majorityThreshold } from "@/lib/seats";
import type { Poll } from "@/lib/types";

export default function Dashboard({
  polls,
  electorateOutlook,
}: {
  polls: Poll[];
  electorateOutlook: ElectorateOutlookSummary;
}) {
  const allPollsters = useMemo(() => {
    const names = new Set(actualPolls(polls).map((p) => p.pollster));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [polls]);

  const mostReliable = useMemo(
    () => allPollsters.filter((p) => getReliability(p).tier === "high"),
    [allPollsters]
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set(allPollsters));
  const [recencyLimit, setRecencyLimit] = useState<RecencyLimit>("all");

  const pollsterFiltered = useMemo(
    () => polls.filter((p) => isElectionResult(p) || selected.has(p.pollster)),
    [polls, selected]
  );

  const filteredPolls = useMemo(() => {
    if (recencyLimit === "all") return pollsterFiltered;
    // Zooming into a recent window: drop the 2023 election-result anchor too,
    // since a 3-year-old reference point isn't useful alongside "last 5 polls".
    const surveys = pollsterFiltered.filter((p) => !isElectionResult(p));
    const mostRecentFirst = [...surveys].sort((a, b) => b.date.localeCompare(a.date));
    return mostRecentFirst.slice(0, recencyLimit).sort((a, b) => a.date.localeCompare(b.date));
  }, [pollsterFiltered, recencyLimit]);

  const series = useMemo(() => computePollOfPolls(filteredPolls), [filteredPolls]);
  const latest = series[series.length - 1];
  const blocPoints = useMemo(() => computeBlocs(series), [series]);

  const [electorateOverride, setElectorateOverride] = useState<ElectorateSeatMap | null>(null);
  useEffect(() => {
    // Deliberately deferred to after mount, not a lazy useState initializer:
    // localStorage doesn't exist during SSR, so reading it during the initial
    // render would make the server-rendered HTML and the client's first
    // render disagree (a hydration mismatch) on every seat number.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setElectorateOverride(loadElectorateOverride());
  }, []);
  const effectiveElectorateSeats = electorateOverride ?? ELECTORATE_SEATS;

  const seatResults = useMemo(
    () => (latest ? computeSeats(latest, effectiveElectorateSeats) : []),
    [latest, effectiveElectorateSeats]
  );
  const blocSeats = useMemo(() => computeBlocSeats(seatResults), [seatResults]);
  const house = houseSize(seatResults);
  const majority = majorityThreshold(seatResults);

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Pollsters included
        </h2>
        <PollsterFilter
          pollsters={allPollsters}
          selected={selected}
          onChange={setSelected}
          mostReliable={mostReliable}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Recency
        </h2>
        <RecencyFilter value={recencyLimit} onChange={setRecencyLimit} />
      </section>

      {latest ? (
        <section className="mb-8">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Current poll of polls
          </h2>
          <LatestSnapshot point={latest} />
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Average of the most recent poll from each selected pollster active in the last 60 days
            ({latest.pollCount} pollster{latest.pollCount === 1 ? "" : "s"}).
          </p>
        </section>
      ) : (
        <section className="mb-8 rounded-lg border border-black/10 px-4 py-6 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
          Select at least one pollster to see the poll of polls.
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Trend
        </h2>
        {series.length > 0 ? (
          <PollChart series={series} />
        ) : (
          <div className="rounded-lg border border-black/10 px-4 py-16 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            No data for the current pollster selection.
          </div>
        )}
      </section>

      {blocPoints.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Blocs
          </h2>
          <BlocChart points={blocPoints} />
        </section>
      )}

      {seatResults.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Seats
          </h2>
          <div className="mb-4">
            <ElectorateEditor
              current={effectiveElectorateSeats}
              isOverride={electorateOverride !== null}
              outlook={electorateOutlook}
              onSave={(next) => {
                saveElectorateOverride(next);
                setElectorateOverride(next);
              }}
              onReset={() => {
                clearElectorateOverride();
                setElectorateOverride(null);
              }}
            />
          </div>
          <SeatsChart blocSeats={blocSeats} houseSize={house} majority={majority} />
          <div className="mt-4">
            <SeatsTable seats={seatResults} />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Modified Sainte-Laguë allocation (New Zealand&apos;s actual MMP method) over today&apos;s poll of
            polls. A party needs 5% party vote or an electorate seat to qualify. There are 71 electorates
            in total; the built-in default only itemizes ACT holding Epsom and Te Pāti Māori holding 5 of
            7 Māori electorates (won 6 of 7 in 2023, minus Mariameno Kapa-Kingi&apos;s May 2026 departure)
            &mdash; the
            remaining electorates sit with National and Labour in reality but aren&apos;t itemized, since
            there&apos;s no electorate-level polling to derive that from (&ldquo;Edit electorate
            assumptions&rdquo; above shows exactly how many of the 71 are currently accounted for, and
            lets you fill in the rest). * marks an overhang seat. Treat as indicative, not an official
            projection.
          </p>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Polls ({filteredPolls.length} of {polls.length})
        </h2>
        <PollsTable polls={filteredPolls} />
      </section>
    </>
  );
}
