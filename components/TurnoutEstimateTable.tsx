import { findTurnoutEstimate } from "@/lib/turnoutEstimates";

function fmtPct(n: number): string {
  return `${n >= 0 ? "" : "−"}${Math.abs(n).toFixed(1)}%`;
}

function fmtDiff(n: number): string {
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}pp`;
}

export default function TurnoutEstimateTable({ electorateNames }: { electorateNames: string[] }) {
  const rows = electorateNames.map(findTurnoutEstimate).filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length === 0) return null;

  return (
    <div className="mb-3 overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className="border-b border-black/10 bg-black/[0.02] text-left uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
            <th className="px-3 py-2 font-medium">Electorate</th>
            <th className="px-2 py-2 text-right font-medium">Enrolled</th>
            <th className="px-2 py-2 text-right font-medium">Counted so far</th>
            <th className="px-2 py-2 text-right font-medium">% so far</th>
            <th className="px-2 py-2 text-right font-medium">vs. national pace</th>
            <th className="px-2 py-2 text-right font-medium">2023 final turnout</th>
            <th className="px-2 py-2 text-right font-medium">Est. votes still to come</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-black/5 last:border-0 dark:border-white/5">
              <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100">{r.name}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.enrolled.toLocaleString()}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.votes.toLocaleString()}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtPct(r.percSoFar)}</td>
              <td
                className={`px-2 py-2 text-right tabular-nums ${
                  r.diffFromNational >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {fmtDiff(r.diffFromNational)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                {fmtPct(r.finalPerc2023)}
              </td>
              <td className="px-2 py-2 text-right font-semibold tabular-nums">
                ~{Math.round(r.projectedOutstanding).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-black/10 px-3 py-2 text-[11px] text-neutral-500 dark:border-white/10 dark:text-neutral-400">
        &quot;Est. votes still to come&quot; splits the Electoral Commission&apos;s own national outstanding-votes
        estimate across electorates using each one&apos;s 2023 preliminary-to-final growth (how much its count grew
        once that election&apos;s special votes were added) &mdash; a rough estimate from manually-entered enrolment
        figures, not an official per-electorate projection.
      </p>
    </div>
  );
}
