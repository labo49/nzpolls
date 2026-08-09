import PartyDot from "@/components/PartyDot";
import { PARTIES } from "@/lib/parties";
import type { PollOfPollsPoint } from "@/lib/types";

export default function LatestSnapshot({ point }: { point: PollOfPollsPoint }) {
  const ranked = PARTIES
    .map((party) => ({ party, value: point.results[party.code] }))
    .filter((r): r is { party: (typeof PARTIES)[number]; value: number } => r.value !== undefined)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {ranked.map(({ party, value }) => (
        <div
          key={party.code}
          className="rounded-lg border border-black/10 px-3 py-2.5 dark:border-white/10"
        >
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <PartyDot color={party.color} />
            {party.name}
          </div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
            {value.toFixed(1)}
            <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
