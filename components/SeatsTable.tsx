import PartyDot from "@/components/PartyDot";
import { PARTY_BY_CODE } from "@/lib/parties";
import type { SeatResult } from "@/lib/seats";

export default function SeatsTable({ seats }: { seats: SeatResult[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
            <th className="px-3 py-2 font-medium">Party</th>
            <th className="px-2 py-2 text-right font-medium">Vote %</th>
            <th className="px-2 py-2 text-right font-medium">Electorate</th>
            <th className="px-2 py-2 text-right font-medium">List</th>
            <th className="px-2 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {seats.map((row) => {
            const party = PARTY_BY_CODE[row.code];
            return (
              <tr key={row.code} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    <PartyDot color={party.color} />
                    {party.name}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{row.votePct.toFixed(1)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.electorateSeats}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.listSeats}</td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">
                  {row.totalSeats}
                  {row.overhang && (
                    <span
                      title="Overhang: this party's electorate seats exceed its proportional entitlement"
                      className="ml-1 text-xs font-normal text-neutral-500 dark:text-neutral-400"
                    >
                      *
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
