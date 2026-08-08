import { PARTIES } from "@/lib/parties";
import { isElectionResult } from "@/lib/pollOfPolls";
import { getReliability, TIER_COLOR, TIER_LABEL } from "@/lib/reliability";
import type { Poll } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

export default function PollsTable({ polls }: { polls: Poll[] }) {
  const rows = [...polls].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Pollster</th>
            <th className="px-3 py-2 text-right font-medium">Sample</th>
            {PARTIES.map((party) => (
              <th key={party.code} className="px-2 py-2 text-right font-medium">
                {party.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((poll) => {
            const isResult = isElectionResult(poll);
            const reliability = getReliability(poll.pollster);
            const dotColor = TIER_COLOR[reliability.tier];
            const dotTitle =
              reliability.meanAbsError !== undefined
                ? `${TIER_LABEL[reliability.tier]} — avg. ${reliability.meanAbsError}pp off the actual 2023 result`
                : TIER_LABEL[reliability.tier];
            return (
              <tr
                key={`${poll.date}-${poll.pollster}`}
                className={`border-b border-black/5 last:border-0 dark:border-white/5 ${
                  isResult ? "bg-black/[0.03] dark:bg-white/[0.04]" : ""
                }`}
              >
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-neutral-600 dark:text-neutral-300">
                  {formatDate(poll.date)}
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    {!isResult && (
                      <span
                        aria-hidden
                        title={dotTitle}
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: dotColor.light }}
                      />
                    )}
                    {poll.sourceUrl ? (
                      <a
                        href={poll.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100 dark:decoration-neutral-600"
                      >
                        {poll.pollster}
                      </a>
                    ) : (
                      poll.pollster
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                  {poll.sampleSize?.toLocaleString("en-NZ") ?? "–"}
                </td>
                {PARTIES.map((party) => (
                  <td key={party.code} className="px-2 py-2 text-right tabular-nums">
                    {poll.results[party.code] !== undefined ? poll.results[party.code]?.toFixed(1) : "–"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
