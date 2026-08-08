import Link from "next/link";
import ElectoratesExplorer from "@/components/ElectoratesExplorer";
import ThemeToggle from "@/components/ThemeToggle";
import electoratesData from "@/data/electorates.json";
import type { ElectoratesData } from "@/lib/electorateTypes";

export const metadata = {
  title: "Electorates — NZ Poll of Polls",
  description: "All 71 New Zealand electorates, their current MP, and a safe/leaning/toss-up trend from the last 3 general elections.",
};

export default function ElectoratesPage() {
  const data = electoratesData as ElectoratesData;
  const fetchedAt = new Date(data.fetchedAt).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-400 dark:decoration-neutral-600"
          >
            ← NZ Poll of Polls
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
            Electorates
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            All {data.electorates.length} electorates, their current MP, and a safe / leaning / toss-up read
            from the last three general elections (2023, 2020, 2017).
          </p>
        </div>
        <ThemeToggle />
      </header>

      <ElectoratesExplorer electorates={data.electorates} />

      <footer className="mt-10 border-t border-black/10 pt-4 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-500">
        <p>
          Classification methodology: an electorate is <strong>safe</strong> if the same party has won every
          election on record with a recent majority over 8,000 votes; <strong>leaning</strong> a party if that
          party has won a majority of the elections on record (2020 was a nationwide landslide that flipped many
          otherwise-consistent seats, so a single loss there doesn&apos;t erase an established pattern) and the
          most recent result agrees; and a <strong>toss-up</strong> otherwise, including any seat that has
          changed hands since its last general election result (by-election or defection) regardless of prior
          margins. Electorate seats aren&apos;t polled directly, so this is built entirely from past results,
          not current voting intention — treat it as historical context, not a prediction. New or substantially
          redrawn 2023 electorates are flagged and classified from fewer elections.
        </p>
        <p className="mt-2">
          Source data:{" "}
          {data.sources.map((src, i) => (
            <span key={src}>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600"
              >
                Wikipedia
              </a>
              {i < data.sources.length - 1 ? ", " : ""}
            </span>
          ))}
          . Last refreshed {fetchedAt}. Run{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">npm run fetch-electorates</code> to
          update.
        </p>
      </footer>
    </main>
  );
}
