import type { ReactNode } from "react";

/**
 * A pill badge whose border/text/dot color has separate light and dark
 * values, swapped via CSS custom properties so the correct one applies
 * per-theme without any client-side JS or a hardcoded `.light` value that
 * silently ignores dark mode (the bug this replaced in ClassificationBadge).
 */
export default function ColorBadge({
  color,
  children,
}: {
  color: { light: string; dark: string };
  children: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium [border-color:var(--badge-color)] [color:var(--badge-color)] dark:[border-color:var(--badge-color-dark)] dark:[color:var(--badge-color-dark)]"
      style={{ "--badge-color": color.light, "--badge-color-dark": color.dark } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full [background-color:var(--badge-color)] dark:[background-color:var(--badge-color-dark)]"
      />
      {children}
    </span>
  );
}
