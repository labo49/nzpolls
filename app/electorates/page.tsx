import CreatedByLine from "@/components/CreatedByLine";
import ElectoratesExplorer from "@/components/ElectoratesExplorer";
import electoratesData from "@/data/electorates.json";
import type { ElectoratesData } from "@/lib/electorateTypes";

export const metadata = {
  title: "Electorates",
  description: "All 71 New Zealand electorates under the 2026 boundaries, their current MP, declared candidates, and a safe/leaning/toss-up trend from the last 3 general elections.",
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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Electorates
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          All {data.electorates.length} electorates under the boundaries finalized 8 August 2026, their current
          MP, declared candidates, and a safe / leaning / toss-up read from the last three general elections
          (2023, 2020, 2017).
        </p>
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
          not current voting intention — treat it as historical context, not a prediction. A nationwide boundary
          review finalized 8 August 2026 renamed or redrew 11 electorates (mostly a lower-North-Island
          consolidation: Ōhāriu, Mana and Ōtaki became Kapiti and Kenepuru, a net reduction of one North Island
          seat, plus straightforward renames elsewhere) — those are flagged as new/redrawn and shown as toss-ups
          with no historical trend until real results exist under the new lines. Current MPs and candidates come
          from whichever candidate is marked as the incumbent for each electorate; candidate selection is
          ongoing, so many electorates are still partially filled in — nominations for the 2026 election don&apos;t
          close until 8 October 2026.
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
        <CreatedByLine />
      </footer>
    </main>
  );
}
