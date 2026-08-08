"use client";

import ActionButton from "@/components/ActionButton";

export type RecencyLimit = "all" | 5 | 10 | 20;

const OPTIONS: { value: RecencyLimit; label: string }[] = [
  { value: "all", label: "All polls" },
  { value: 5, label: "Last 5" },
  { value: 10, label: "Last 10" },
  { value: 20, label: "Last 20" },
];

export default function RecencyFilter({
  value,
  onChange,
}: {
  value: RecencyLimit;
  onChange: (next: RecencyLimit) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => (
        <ActionButton key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)}>
          {opt.label}
        </ActionButton>
      ))}
    </div>
  );
}
