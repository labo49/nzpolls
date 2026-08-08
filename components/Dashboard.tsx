"use client";

import { useMemo, useState } from "react";
import BlocChart from "@/components/BlocChart";
import LatestSnapshot from "@/components/LatestSnapshot";
import PollChart from "@/components/PollChart";
import PollsTable from "@/components/PollsTable";
import PollsterFilter from "@/components/PollsterFilter";
import RecencyFilter, { type RecencyLimit } from "@/components/RecencyFilter";
import SeatsChart from "@/components/SeatsChart";
import SeatsTable from "@/components/SeatsTable";
import { computeBlocs, computeBlocSeats } from "@/lib/blocs";
import { actualPolls, computePollOfPolls, isElectionResult } from "@/lib/pollOfPolls";
import { getReliability } from "@/lib/reliability";
import { computeSeats, houseSize, majorityThreshold } from "@/lib/seats";
import type { Poll } from "@/lib/types";

export default function Dashboard({ polls }: { polls: Poll[] }) {
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

  const seatResults = useMemo(() => (latest ? computeSeats(latest) : []), [latest]);
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
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
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
          <SeatsChart blocSeats={blocSeats} houseSize={house} majority={majority} />
          <div className="mt-4">
            <SeatsTable seats={seatResults} />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
            Modified Sainte-Laguë allocation (New Zealand&apos;s actual MMP method) over today&apos;s poll of
            polls. A party needs 5% party vote or an electorate seat to qualify. Electorate seats are a
            static, manually-set assumption (ACT: Epsom; Te Pāti Māori: 6 of 7 Māori electorates, after
            Mariameno Kapa-Kingi&apos;s May 2026 departure) &mdash; not derived from polling, since there
            is no electorate-level polling to scrape. * marks an overhang seat. Treat as indicative, not
            an official projection.
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
