import type { Poll } from "@/lib/types";

function formatAddedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

export default function NewPollsBanner({ polls }: { polls: Poll[] }) {
  if (polls.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-black/10 bg-emerald-50/60 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-emerald-950/20">
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-400">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
        New poll{polls.length > 1 ? "s" : ""} added:
      </span>
      <span className="text-neutral-700 dark:text-neutral-300">
        {polls.map((p, i) => (
          <span key={`${p.pollster}-${p.dateLabel}`}>
            {p.pollster} ({p.dateLabel}) &mdash; {formatAddedDate(p.firstSeenAt)}
            {i < polls.length - 1 ? " · " : ""}
          </span>
        ))}
      </span>
    </div>
  );
}
