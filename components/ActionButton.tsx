"use client";

import type { ReactNode } from "react";

export default function ActionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
          : "border-black/15 bg-white text-neutral-700 hover:bg-black/5 dark:border-white/15 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
