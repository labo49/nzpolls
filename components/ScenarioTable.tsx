import PartyDot from "@/components/PartyDot";
import { BLOCS, computeBlocSeats } from "@/lib/blocs";
import type { ScenarioStep } from "@/lib/electionScenarios";
import { PARTY_BY_CODE } from "@/lib/parties";

const PARTY_CODES = ["NAT", "LAB", "GRN", "ACT", "NZF", "TOP", "TPM"] as const;

function majorityStatus(step: ScenarioStep): { label: string; color: string } {
  const blocSeats = computeBlocSeats(step.seats);
  const right = blocSeats.RIGHT ?? 0;
  const left = blocSeats.LEFT ?? 0;
  if (right >= step.majorityThreshold) {
    return { label: `Right bloc governs (+${right - step.majorityThreshold})`, color: BLOCS[0].color.light };
  }
  if (left >= step.majorityThreshold) {
    return { label: `Left bloc governs (+${left - step.majorityThreshold})`, color: BLOCS[1].color.light };
  }
  return { label: "No bloc reaches a majority", color: "#737373" };
}

function ScenarioRow({ step, baseline }: { step: ScenarioStep; baseline?: boolean }) {
  const status = majorityStatus(step);
  const byCode = new Map(step.seats.map((r) => [r.code, r]));
  const blocSeats = computeBlocSeats(step.seats);
  return (
    <tr
      className={`border-b border-black/5 last:border-0 dark:border-white/5${
        baseline ? " bg-black/[0.02] dark:bg-white/[0.03]" : ""
      }`}
    >
      <td className={`px-3 py-2 text-neutral-900 dark:text-neutral-100 ${baseline ? "italic" : "font-medium"}`}>
        {step.label}
      </td>
      {PARTY_CODES.map((code) => {
        const seat = byCode.get(code);
        const party = PARTY_BY_CODE[code];
        return (
          <td key={code} className="px-2 py-2 text-right tabular-nums">
            {seat ? (
              <>
                {seat.totalSeats}
                {seat.overhang && (
                  <span title="Overhang" className="ml-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                    *
                  </span>
                )}
              </>
            ) : (
              <span className="text-neutral-300 dark:text-neutral-600">—</span>
            )}
            <span className="sr-only">{party.name}</span>
          </td>
        );
      })}
      {BLOCS.map((bloc, i) => (
        <td
          key={bloc.key}
          className={`px-2 py-2 text-right font-semibold tabular-nums text-neutral-700 dark:text-neutral-300${
            i === 0 ? " border-l border-black/10 dark:border-white/10" : ""
          }`}
        >
          {blocSeats[bloc.key] ?? 0}
          <span className="sr-only">{bloc.label}</span>
        </td>
      ))}
      <td className="px-2 py-2 text-right font-semibold tabular-nums">{step.houseSize}</td>
      <td className="px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: status.color }}>
          <PartyDot color={{ light: status.color, dark: status.color }} />
          {status.label}
        </span>
      </td>
    </tr>
  );
}

export default function ScenarioTable({
  steps,
  firstColumnLabel = "Change",
  baseline,
}: {
  steps: ScenarioStep[];
  firstColumnLabel?: string;
  /** Today's real preliminary result, shown as a distinct first row so each
   * scenario row's shift (including which bloc-total columns actually
   * moved) is visible against a fixed reference instead of requiring the
   * reader to recall the Seats section above. */
  baseline?: ScenarioStep;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
            <th className="px-3 py-2 font-medium">{firstColumnLabel}</th>
            {PARTY_CODES.map((code) => (
              <th key={code} className="px-2 py-2 text-right font-medium">
                {code}
              </th>
            ))}
            {BLOCS.map((bloc, i) => (
              <th
                key={bloc.key}
                className={`px-2 py-2 text-right font-medium${i === 0 ? " border-l border-black/10 dark:border-white/10" : ""}`}
              >
                {bloc.key === "TOP" ? "TOP" : bloc.key === "RIGHT" ? "Right" : "Left"}
              </th>
            ))}
            <th className="px-2 py-2 text-right font-medium">House</th>
            <th className="px-3 py-2 font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {baseline && <ScenarioRow key={`baseline-${baseline.label}`} step={baseline} baseline />}
          {steps.map((step) => (
            <ScenarioRow key={step.label} step={step} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
