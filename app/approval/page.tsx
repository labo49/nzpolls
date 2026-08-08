import ApprovalDashboard from "@/components/ApprovalDashboard";
import CreatedByLine from "@/components/CreatedByLine";
import approvalData from "@/data/approval.json";
import type { ApprovalData } from "@/lib/approvalTypes";

export const metadata = {
  title: "Approval Ratings",
  description: "Preferred prime minister and leadership approval polling for the 2026 New Zealand general election.",
};

export default function ApprovalPage() {
  const data = approvalData as ApprovalData;
  const fetchedAt = new Date(data.fetchedAt).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Approval Ratings
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Preferred prime minister and leadership approval polling ahead of the 2026 New Zealand general
          election.
        </p>
      </header>

      <ApprovalDashboard data={data} />

      <footer className="border-t border-black/10 pt-4 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-500">
        <p>
          Source data:{" "}
          <a
            href={data.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600"
          >
            Wikipedia &mdash; Opinion polling for the 2026 New Zealand general election
          </a>
          . Last refreshed {fetchedAt}. Some older leadership-approval polls that tracked fewer leaders
          than the current lineup aren&apos;t shown, rather than risk misattributing a value to the wrong
          leader.
        </p>
        <CreatedByLine />
      </footer>
    </main>
  );
}
