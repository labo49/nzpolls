import ColorBadge from "@/components/ColorBadge";
import CreatedByLine from "@/components/CreatedByLine";
import PartyDot from "@/components/PartyDot";
import { PARTY_BY_CODE } from "@/lib/parties";
import { getReliability, TIER_COLOR, TIER_LABEL } from "@/lib/reliability";
import { pageMetadata } from "@/lib/site";
import accuracyData from "@/data/pollsterAccuracy.json";
import type { PollsterAccuracyData } from "@/lib/pollsterAccuracyTypes";

export const metadata = pageMetadata(
  "Pollster Reliability",
  "Why each pollster is rated high, moderate, or lower accuracy: their final poll before the 2023 election, compared party-by-party against the actual 2023 result.",
  "/reliability"
);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReliabilityPage() {
  const data = accuracyData as PollsterAccuracyData;

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          Pollster Reliability
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          {data.methodology}
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-black/10 px-4 py-3 dark:border-white/10">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Actual {new Date(data.referenceElection).getFullYear()} election result (the reference point)
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {Object.entries(data.actualResult).map(([code, pct]) => {
            const party = PARTY_BY_CODE[code as keyof typeof PARTY_BY_CODE];
            return (
              <span key={code} className="flex items-center gap-1.5">
                <PartyDot color={party.color} />
                {party.name} <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{pct}%</span>
              </span>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        {data.ratings.map((rating) => {
          const reliability = getReliability(rating.pollster);
          const dotColor = TIER_COLOR[reliability.tier];
          return (
            <div key={rating.pollster} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{rating.pollster}</h3>
                <ColorBadge color={dotColor}>{TIER_LABEL[reliability.tier]}</ColorBadge>
              </div>
              <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                Final poll before the 2023 election:{" "}
                {rating.sourceUrl ? (
                  <a
                    href={rating.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600"
                  >
                    {formatDate(rating.finalPollDate)}
                  </a>
                ) : (
                  formatDate(rating.finalPollDate)
                )}
                . Mean absolute error across {rating.partiesCompared} parties:{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{rating.meanAbsError}pp</span>.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                      <th className="py-1.5 pr-3 font-medium">Party</th>
                      <th className="px-2 py-1.5 text-right font-medium">Polled</th>
                      <th className="px-2 py-1.5 text-right font-medium">Actual</th>
                      <th className="pl-2 py-1.5 text-right font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rating.breakdown.map((row) => {
                      const party = PARTY_BY_CODE[row.party];
                      return (
                        <tr key={row.party} className="border-b border-black/5 last:border-0 dark:border-white/5">
                          <td className="py-1.5 pr-3">
                            <span className="flex items-center gap-1.5">
                              <PartyDot color={party.color} />
                              {party.name}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{row.polled}%</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{row.actual}%</td>
                          <td className="pl-2 py-1.5 text-right tabular-nums text-neutral-600 dark:text-neutral-300">
                            {row.error}pp
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      {data.omitted.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Not yet rated
          </h2>
          <div className="space-y-2">
            {data.omitted.map((o) => (
              <div key={o.pollster} className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{o.pollster}</div>
                <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{o.reason}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-10 border-t border-black/10 pt-4 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
        <p>
          Reliability tiers used across the site: high accuracy (≤1.0pp average error), moderate (≤2.0pp), lower
          (&gt;2.0pp). Source data:{" "}
          <a
            href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_2023_New_Zealand_general_election"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600"
          >
            Wikipedia &mdash; Opinion polling for the 2023 New Zealand general election
          </a>
          . This is a one-off historical calibration against a fixed reference point, not part of the daily
          refresh &mdash; it&apos;s only re-run if the tracked pollster roster changes.
        </p>
        <CreatedByLine />
      </footer>
    </main>
  );
}
