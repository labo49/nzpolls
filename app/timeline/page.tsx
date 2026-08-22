import Link from "next/link";
import CreatedByLine from "@/components/CreatedByLine";
import LeaderTimelineChart from "@/components/LeaderTimelineChart";
import PollTimelineChart from "@/components/PollTimelineChart";
import { buildTimelineFrames } from "@/lib/timelineSeries";
import { pageMetadata } from "@/lib/site";
import polls from "@/data/polls.json";
import milestones from "@/data/milestones.json";
import meta from "@/data/meta.json";
import approval from "@/data/approval.json";
import type { Poll } from "@/lib/types";
import type { Milestone } from "@/lib/wikiPollScraper";
import type { ApprovalData } from "@/lib/approvalTypes";

export const metadata = pageMetadata(
  "Poll Timeline",
  "Animated trends from the 2023 election to today: the poll-of-polls party vote and preferred-PM leader support, with key political events overlaid -- built from every published poll.",
  "/timeline"
);

export default function TimelinePage() {
  const frames = buildTimelineFrames(polls as Poll[]);
  const typedMilestones = milestones as Milestone[];
  const { preferredPm } = approval as ApprovalData;

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Poll Timeline
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Every party&apos;s poll-of-polls trend from the 2023 election result to the most
          recent poll, with key events marked along the way. Press play, or drag the
          scrubber to explore.
        </p>
      </header>

      <PollTimelineChart frames={frames} milestones={typedMilestones} />

      <section className="mt-14">
        <header className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-2xl">
            Party Leader Support
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            Each party leader&apos;s preferred-Prime-Minister trend, same rolling-average
            construction as the chart above, from the earliest recorded poll to today.
          </p>
        </header>
        <LeaderTimelineChart leaders={preferredPm.leaders} polls={preferredPm.polls} milestones={typedMilestones} />
      </section>

      <footer className="mt-10 border-t border-black/10 pt-4 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
        <p>
          Prefer a table? See the full poll history on the{" "}
          <Link href="/" className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600">
            Poll of Polls
          </Link>{" "}
          page, or the preferred-PM history on{" "}
          <Link href="/approval" className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600">
            Approval Ratings
          </Link>
          . Source data:{" "}
          <a
            href={meta.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600"
          >
            Wikipedia &mdash; Opinion polling for the 2026 New Zealand general election
          </a>
          . Last refreshed {new Date(meta.fetchedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}.
        </p>
        <CreatedByLine />
      </footer>
    </main>
  );
}
