import PartyDot from "@/components/PartyDot";
import { leaderParty } from "@/lib/leaders";
import { PARTY_BY_CODE } from "@/lib/parties";
import type { LeaderColumn } from "@/lib/approvalTypes";

function formatValue(value: number, signed: boolean): string {
  const fixed = value.toFixed(1);
  return signed && value > 0 ? `+${fixed}` : fixed;
}

export default function LeaderSnapshot({
  leaders,
  values,
  suffix = "%",
  signed = false,
}: {
  leaders: LeaderColumn[];
  values: Record<string, number>;
  suffix?: string;
  signed?: boolean;
}) {
  const ranked = leaders
    .map((leader) => ({ leader, value: values[leader.key] }))
    .filter((r): r is { leader: LeaderColumn; value: number } => r.value !== undefined)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {ranked.map(({ leader, value }) => {
        const party = PARTY_BY_CODE[leaderParty(leader.key)];
        return (
          <div
            key={leader.key}
            className="rounded-lg border border-black/10 px-3 py-2.5 dark:border-white/10"
          >
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <PartyDot color={party.color} />
              {leader.shortName}
            </div>
            <div className="mt-0.5 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
              {formatValue(value, signed)}
              <span className="text-sm font-normal text-neutral-400">{suffix}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
