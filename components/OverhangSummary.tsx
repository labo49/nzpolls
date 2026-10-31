import PartyDot from "@/components/PartyDot";
import { NOMINAL_TOTAL_SEATS } from "@/lib/electorates";
import { PARTY_BY_CODE } from "@/lib/parties";
import { totalOverhangSeats, type SeatResult } from "@/lib/seats";

export default function OverhangSummary({ seats }: { seats: SeatResult[] }) {
  const overhangParties = seats.filter((s) => s.overhang);
  const total = totalOverhangSeats(seats);

  if (overhangParties.length === 0) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        No overhang seats in this projection &mdash; the House stays at the nominal {NOMINAL_TOTAL_SEATS} seats.
      </p>
    );
  }

  return (
    <p className="text-xs text-neutral-700 dark:text-neutral-300">
      <span className="font-medium">
        {total} overhang seat{total === 1 ? "" : "s"}
      </span>
      , growing the House from {NOMINAL_TOTAL_SEATS} to{" "}
      <span className="font-medium">{NOMINAL_TOTAL_SEATS + total}</span> seats:{" "}
      {overhangParties.map((s, i) => {
        const party = PARTY_BY_CODE[s.code];
        return (
          <span key={s.code} className="inline-flex items-center gap-1">
            <PartyDot color={party.color} />
            {party.name} +{s.overhangSeats}
            {i < overhangParties.length - 1 ? ", " : ""}
          </span>
        );
      })}{" "}
      &mdash; each holds more electorate seats than its party-vote share alone would entitle it to.
    </p>
  );
}
