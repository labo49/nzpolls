import CreatedByLine from "@/components/CreatedByLine";
import Dashboard from "@/components/Dashboard";
import NewPollsBanner from "@/components/NewPollsBanner";
import { actualPolls } from "@/lib/pollOfPolls";
import { recentlyAddedPolls } from "@/lib/newPolls";
import { SITE_NAME, pageMetadata } from "@/lib/site";
import polls from "@/data/polls.json";
import meta from "@/data/meta.json";
import type { Poll } from "@/lib/types";

export const metadata = {
  ...pageMetadata(
    "Poll of Polls",
    "A rolling poll-of-polls average for the 2026 New Zealand general election, weighting each pollster's most recent survey and refreshed daily from published polls.",
    "/"
  ),
  // The root layout's title template doesn't apply to the "/" route itself
  // (verified against a fresh build, not just a stale-server artifact) --
  // spell the full title out explicitly instead of relying on it here.
  title: `Poll of Polls — ${SITE_NAME}`,
};

export default function Home() {
  const typedPolls = polls as Poll[];
  const surveyCount = actualPolls(typedPolls).length;

  const fetchedAt = new Date(meta.fetchedAt).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <NewPollsBanner polls={recentlyAddedPolls(typedPolls)} />

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Poll of Polls
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          A rolling average of published opinion polls ahead of the 2026 New Zealand
          general election, built from {surveyCount} surveys since the 2023 election.
        </p>
      </header>

      <Dashboard polls={typedPolls} />

      <footer className="border-t border-black/10 pt-4 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-500">
        <p>
          Source data:{" "}
          <a
            href={meta.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600"
          >
            Wikipedia &mdash; Opinion polling for the 2026 New Zealand general election
          </a>
          . Last refreshed {fetchedAt}.
        </p>
        <CreatedByLine />
      </footer>
    </main>
  );
}
