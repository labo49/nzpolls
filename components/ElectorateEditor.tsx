"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";
import PartyDot from "@/components/PartyDot";
import { PARTIES } from "@/lib/parties";
import { TOTAL_ELECTORATE_SEATS, totalAllocatedElectorateSeats } from "@/lib/electorates";
import type { ElectorateSeatMap } from "@/lib/electorates";

const EDITABLE_PARTIES = PARTIES.filter((p) => p.code !== "OTH");

function CompletenessNote({ map }: { map: ElectorateSeatMap }) {
  const allocated = totalAllocatedElectorateSeats(map);
  const complete = allocated === TOTAL_ELECTORATE_SEATS;
  return (
    <p
      className={`text-xs ${
        complete
          ? "text-neutral-500 dark:text-neutral-500"
          : "font-medium text-amber-700 dark:text-amber-500"
      }`}
    >
      {complete ? (
        <>
          &#10003; All {TOTAL_ELECTORATE_SEATS} electorates accounted for.
        </>
      ) : (
        <>
          &#9888; Only {allocated} of {TOTAL_ELECTORATE_SEATS} electorate seats specified &mdash;{" "}
          {TOTAL_ELECTORATE_SEATS - allocated} unaccounted for (their held-by party isn&apos;t set, so
          they default to that party&apos;s list-only entitlement).
        </>
      )}
    </p>
  );
}

export default function ElectorateEditor({
  current,
  isOverride,
  onSave,
  onReset,
}: {
  current: ElectorateSeatMap;
  isOverride: boolean;
  onSave: (next: ElectorateSeatMap) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ElectorateSeatMap>(current);

  function openEditor() {
    setDraft(current);
    setOpen(true);
  }

  function submit() {
    const cleaned: ElectorateSeatMap = {};
    for (const party of EDITABLE_PARTIES) {
      const value = draft[party.code] ?? 0;
      if (value > 0) cleaned[party.code] = value;
    }
    onSave(cleaned);
    setOpen(false);
  }

  if (!open) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton active={isOverride} onClick={openEditor}>
            {isOverride ? "Using your electorate override" : "Edit electorate assumptions"}
          </ActionButton>
          {isOverride && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-400 dark:decoration-neutral-600"
            >
              Reset to default
            </button>
          )}
        </div>
        <div className="mt-1.5">
          <CompletenessNote map={current} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
        How many electorate seats does each party currently hold? Saved in this browser only &mdash;
        there&apos;s no shared backend, so this won&apos;t change what other visitors see.
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {EDITABLE_PARTIES.map((party) => (
          <label key={party.code} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <PartyDot color={party.color} />
              {party.name}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={71}
              value={draft[party.code] ?? 0}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [party.code]: Math.max(0, Number(e.target.value) || 0) }))
              }
              className="w-14 rounded border border-black/15 bg-transparent px-1.5 py-0.5 text-right tabular-nums dark:border-white/15"
            />
          </label>
        ))}
      </div>
      <div className="mt-3">
        <CompletenessNote map={draft} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Save override
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-black/5 dark:border-white/15 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-white/5"
        >
          Cancel
        </button>
        {isOverride && (
          <button
            type="button"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
            className="ml-auto text-xs font-medium text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-400 dark:decoration-neutral-600"
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}
