"use client";

import { useMemo, useState } from "react";
import LeaderPollsTable from "@/components/LeaderPollsTable";
import LeaderSnapshot from "@/components/LeaderSnapshot";
import LeaderTrendChart from "@/components/LeaderTrendChart";
import PollsterFilter from "@/components/PollsterFilter";
import { getReliability } from "@/lib/reliability";
import type { ApprovalData } from "@/lib/approvalTypes";

export default function ApprovalDashboard({ data }: { data: ApprovalData }) {
  const allPollsters = useMemo(() => {
    const names = new Set<string>();
    for (const p of data.preferredPm.polls) names.add(p.pollster);
    for (const p of data.leadershipApproval.polls) names.add(p.pollster);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const mostReliable = useMemo(
    () => allPollsters.filter((p) => getReliability(p).tier === "high"),
    [allPollsters]
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set(allPollsters));

  const pmPolls = useMemo(
    () => data.preferredPm.polls.filter((p) => selected.has(p.pollster)),
    [data, selected]
  );
  const approvalPolls = useMemo(
    () => data.leadershipApproval.polls.filter((p) => selected.has(p.pollster)),
    [data, selected]
  );

  const latestPm = pmPolls[pmPolls.length - 1];
  const latestApproval = approvalPolls[approvalPolls.length - 1];

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

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Preferred prime minister
        </h2>
        {latestPm ? (
          <>
            <LeaderSnapshot leaders={data.preferredPm.leaders} values={latestPm.results} />
            <p className="mt-2 mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              Most recent poll: {latestPm.pollster} ({latestPm.dateLabel}).
            </p>
            <LeaderTrendChart leaders={data.preferredPm.leaders} polls={pmPolls} />
          </>
        ) : (
          <div className="rounded-lg border border-black/10 px-4 py-16 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            No data for the current pollster selection.
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Leadership approval rating
        </h2>
        {latestApproval ? (
          <>
            <LeaderSnapshot
              leaders={data.leadershipApproval.leaders}
              values={latestApproval.results}
              suffix="pp"
              signed
            />
            <p className="mt-2 mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              Net approval (approve minus disapprove). Most recent poll: {latestApproval.pollster} (
              {latestApproval.dateLabel}).
            </p>
            <LeaderTrendChart
              leaders={data.leadershipApproval.leaders}
              polls={approvalPolls}
              suffix="pp"
              signed
              showZeroLine
            />
          </>
        ) : (
          <div className="rounded-lg border border-black/10 px-4 py-16 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            No data for the current pollster selection.
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Preferred PM polls ({pmPolls.length} of {data.preferredPm.polls.length})
        </h2>
        <LeaderPollsTable leaders={data.preferredPm.leaders} polls={pmPolls} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Leadership approval polls ({approvalPolls.length} of {data.leadershipApproval.polls.length})
        </h2>
        <LeaderPollsTable leaders={data.leadershipApproval.leaders} polls={approvalPolls} signed />
      </section>
    </>
  );
}
