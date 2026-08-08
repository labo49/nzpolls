"use client";

import { getReliability, TIER_COLOR, TIER_LABEL } from "@/lib/reliability";

interface PollsterFilterProps {
  pollsters: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  mostReliable: string[];
}

export default function PollsterFilter({ pollsters, selected, onChange, mostReliable }: PollsterFilterProps) {
  const allSelected = selected.size === pollsters.length;
  const isMostReliableSelection =
    selected.size === mostReliable.length && mostReliable.every((p) => selected.has(p));

  function toggle(pollster: string) {
    const next = new Set(selected);
    if (next.has(pollster)) {
      next.delete(pollster);
    } else {
      next.add(pollster);
    }
    onChange(next);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(new Set(pollsters))}
          disabled={allSelected}
          className="text-xs font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 disabled:cursor-default disabled:text-neutral-400 disabled:no-underline dark:text-neutral-300 dark:decoration-neutral-600 dark:disabled:text-neutral-600"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => onChange(new Set())}
          disabled={selected.size === 0}
          className="text-xs font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 disabled:cursor-default disabled:text-neutral-400 disabled:no-underline dark:text-neutral-300 dark:decoration-neutral-600 dark:disabled:text-neutral-600"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onChange(new Set(mostReliable))}
          disabled={mostReliable.length === 0 || isMostReliableSelection}
          className="text-xs font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 disabled:cursor-default disabled:text-neutral-400 disabled:no-underline dark:text-neutral-300 dark:decoration-neutral-600 dark:disabled:text-neutral-600"
        >
          Most reliable only
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pollsters.map((pollster) => {
          const isOn = selected.has(pollster);
          const reliability = getReliability(pollster);
          const dotColor = TIER_COLOR[reliability.tier];
          const title =
            reliability.meanAbsError !== undefined
              ? `${TIER_LABEL[reliability.tier]} — avg. ${reliability.meanAbsError}pp off the actual 2023 result`
              : TIER_LABEL[reliability.tier];
          return (
            <button
              key={pollster}
              type="button"
              onClick={() => toggle(pollster)}
              aria-pressed={isOn}
              title={title}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                isOn
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-black/15 text-neutral-500 hover:border-black/30 dark:border-white/15 dark:text-neutral-500 dark:hover:border-white/30"
              }`}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: dotColor.light }}
              />
              {pollster}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        Dot color is accuracy vs. the actual 2023 result (green = high, amber = moderate, red = lower,
        gray = no 2023 pre-election poll on record). Hover a pollster for its exact error.
      </p>
    </div>
  );
}
