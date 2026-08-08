"use client";

interface PollsterFilterProps {
  pollsters: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export default function PollsterFilter({ pollsters, selected, onChange }: PollsterFilterProps) {
  const allSelected = selected.size === pollsters.length;

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
      <div className="mb-2 flex items-center gap-3">
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
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pollsters.map((pollster) => {
          const isOn = selected.has(pollster);
          return (
            <button
              key={pollster}
              type="button"
              onClick={() => toggle(pollster)}
              aria-pressed={isOn}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                isOn
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-black/15 text-neutral-500 hover:border-black/30 dark:border-white/15 dark:text-neutral-500 dark:hover:border-white/30"
              }`}
            >
              {pollster}
            </button>
          );
        })}
      </div>
    </div>
  );
}
