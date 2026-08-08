"use client";

import { useMemo, useState } from "react";
import BlocChart from "@/components/BlocChart";
import LatestSnapshot from "@/components/LatestSnapshot";
import PollChart from "@/components/PollChart";
import PollsTable from "@/components/PollsTable";
import PollsterFilter from "@/components/PollsterFilter";
import { computeBlocs } from "@/lib/blocs";
import { actualPolls, computePollOfPolls, isElectionResult } from "@/lib/pollOfPolls";
import { getReliability } from "@/lib/reliability";
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

  const filteredPolls = useMemo(
    () => polls.filter((p) => isElectionResult(p) || selected.has(p.pollster)),
    [polls, selected]
  );

  const series = useMemo(() => computePollOfPolls(filteredPolls), [filteredPolls]);
  const latest = series[series.length - 1];
  const blocPoints = useMemo(() => computeBlocs(series), [series]);

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

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Polls ({filteredPolls.length} of {polls.length})
        </h2>
        <PollsTable polls={filteredPolls} />
      </section>
    </>
  );
}
