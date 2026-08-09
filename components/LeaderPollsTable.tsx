import { leaderParty } from "@/lib/leaders";
import { PARTY_BY_CODE } from "@/lib/parties";
import type { LeaderColumn, LeaderPoll } from "@/lib/approvalTypes";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function formatValue(value: number | undefined, signed: boolean): string {
  if (value === undefined) return "–";
  const fixed = value.toFixed(1);
  return signed && value > 0 ? `+${fixed}` : fixed;
}

export default function LeaderPollsTable({
  leaders,
  polls,
  signed = false,
}: {
  leaders: LeaderColumn[];
  polls: LeaderPoll[];
  signed?: boolean;
}) {
  const rows = [...polls].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Pollster</th>
            <th className="px-3 py-2 text-right font-medium">Sample</th>
            {leaders.map((leader) => (
              <th key={leader.key} className="px-2 py-2 text-right font-medium">
                {leader.shortName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((poll) => (
            <tr
              key={`${poll.date}-${poll.pollster}`}
              className="border-b border-black/5 last:border-0 dark:border-white/5"
            >
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-neutral-600 dark:text-neutral-300">
                {formatDate(poll.date)}
              </td>
              <td className="px-3 py-2">
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
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                {poll.sampleSize?.toLocaleString("en-NZ") ?? "–"}
              </td>
              {leaders.map((leader) => (
                <td key={leader.key} className="px-2 py-2 text-right tabular-nums">
                  {formatValue(poll.results[leader.key], signed)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-black/5 px-3 py-2 text-xs text-neutral-500 dark:border-white/5 dark:text-neutral-400">
        {leaders.map((l, i) => (
          <span key={l.key}>
            {l.shortName} = {PARTY_BY_CODE[leaderParty(l.key)].name}
            {i < leaders.length - 1 ? ", " : ""}
          </span>
        ))}
      </p>
    </div>
  );
}
