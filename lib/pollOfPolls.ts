import { PARTIES, type PartyCode } from "./parties";
import type { Poll, PollOfPollsPoint } from "./types";

const ELECTION_RESULT_MARKER = "election result";

export function isElectionResult(poll: Poll): boolean {
  return poll.pollster.toLowerCase().includes(ELECTION_RESULT_MARKER);
}

/** Actual surveys only -- excludes the last-election-result reference row. */
export function actualPolls(polls: Poll[]): Poll[] {
  return polls.filter((p) => !isElectionResult(p));
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/**
 * At each poll's date, averages the most recent poll from each pollster
 * (within a trailing window) so no single house is overweighted just for
 * polling more often. This is the standard "poll of polls" construction.
 */
export function computePollOfPolls(
  polls: Poll[],
  windowDays = 60
): PollOfPollsPoint[] {
  const surveys = actualPolls(polls)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  return surveys.map((poll) => {
    const asOf = new Date(poll.date).getTime();
    const inWindow = surveys.filter((p) => {
      const t = new Date(p.date).getTime();
      return t <= asOf && asOf - t <= windowMs;
    });

    // Most recent poll per pollster within the window.
    const latestByPollster = new Map<string, Poll>();
    for (const p of inWindow) {
      const existing = latestByPollster.get(p.pollster);
      if (!existing || existing.date < p.date) {
        latestByPollster.set(p.pollster, p);
      }
    }
    const contributing = Array.from(latestByPollster.values());

    const results: Partial<Record<PartyCode, number>> = {};
    for (const party of PARTIES) {
      const values = contributing
        .map((p) => p.results[party.code])
        .filter((v): v is number => v !== undefined);
      const avg = average(values);
      if (avg !== undefined) results[party.code] = avg;
    }

    return { date: poll.date, pollCount: contributing.length, results };
  });
}

/** The most recent poll-of-polls point, i.e. today's aggregate. */
export function latestPollOfPolls(polls: Poll[], windowDays = 60): PollOfPollsPoint | null {
  const series = computePollOfPolls(polls, windowDays);
  return series.length > 0 ? series[series.length - 1] : null;
}
