import ScenarioTable from "@/components/ScenarioTable";
import TurnoutEstimateTable from "@/components/TurnoutEstimateTable";
import type { ScenarioGroup, ScenarioStep } from "@/lib/electionScenarios";

export default function ScenarioGroupSection({ group, baseline }: { group: ScenarioGroup; baseline: ScenarioStep }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{group.title}</h3>
      <p className="mb-2 mt-1 max-w-2xl text-xs text-neutral-600 dark:text-neutral-400">{group.mechanism}</p>
      <TurnoutEstimateTable electorateNames={group.electorates} />
      <ScenarioTable steps={group.steps} firstColumnLabel="If this happens" baseline={baseline} />
    </div>
  );
}
