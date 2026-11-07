import PartyDot from "@/components/PartyDot";
import { PARTY_BY_CODE } from "@/lib/parties";
import type { ElectorateResultRow } from "@/lib/electorateResults";

export default function ElectorateResultsTable({
  electorates,
  closeRaceNames,
  totalElectorates,
}: {
  electorates: ElectorateResultRow[];
  closeRaceNames: Set<string>;
  totalElectorates: number;
}) {
  const sorted = [...electorates].sort((a, b) => a.electorateName.localeCompare(b.electorateName));
  const outstanding = totalElectorates - electorates.length;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
              <th className="px-3 py-2 font-medium">Electorate</th>
              <th className="px-2 py-2 font-medium">Winner</th>
              <th className="px-2 py-2 text-right font-medium">Majority</th>
              <th className="px-2 py-2 font-medium">Runner-up</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => {
              const winnerParty = e.winnerParty !== "OTH" ? PARTY_BY_CODE[e.winnerParty] : null;
              const runnerUpParty = e.runnerUpParty !== "OTH" ? PARTY_BY_CODE[e.runnerUpParty] : null;
              const close = closeRaceNames.has(e.electorateName);
              return (
                <tr key={e.electorateName} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-3 py-2">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{e.electorateName}</span>
                    {close && (
                      <span className="ml-1.5 rounded-full border border-orange-400/50 bg-orange-500/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-400/40 dark:text-orange-400">
                        too close to call
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-1.5">
                      {winnerParty ? <PartyDot color={winnerParty.color} /> : <span className="h-2 w-2" />}
                      {e.winnerName}
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {winnerParty ? winnerParty.name : "Independent / other"}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{e.majority?.toLocaleString() ?? "—"}</td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                      {runnerUpParty ? <PartyDot color={runnerUpParty.color} /> : <span className="h-2 w-2" />}
                      {e.runnerUpName}
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {runnerUpParty ? runnerUpParty.name : "Independent / other"}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {outstanding > 0 && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          {outstanding} electorate{outstanding === 1 ? "" : "s"} not yet reported on the source page.
        </p>
      )}
    </div>
  );
}
