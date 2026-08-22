import type { LeaderPoll } from "./approvalTypes";

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export interface LeaderTrendPoint {
  date: string;
  pollCount: number;
  results: Record<string, number>;
}

/**
 * The same rolling "poll of polls" construction as lib/pollOfPolls.ts's
 * computePollOfPolls (most recent poll per pollster within a trailing
 * window, averaged), adapted for leader-keyed LeaderPoll data instead of
 * party-keyed Poll data -- kept as a separate small function rather than
 * generalizing the original, which stays untouched and low-risk.
 */
export function computeLeaderTrend(polls: LeaderPoll[], leaderKeys: string[], windowDays = 60): LeaderTrendPoint[] {
  const surveys = polls.slice().sort((a, b) => a.date.localeCompare(b.date));
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  return surveys.map((poll) => {
    const asOf = new Date(poll.date).getTime();
    const inWindow = surveys.filter((p) => {
      const t = new Date(p.date).getTime();
      return t <= asOf && asOf - t <= windowMs;
    });

    const latestByPollster = new Map<string, LeaderPoll>();
    for (const p of inWindow) {
      const existing = latestByPollster.get(p.pollster);
      if (!existing || existing.date < p.date) {
        latestByPollster.set(p.pollster, p);
      }
    }
    const contributing = Array.from(latestByPollster.values());

    const results: Record<string, number> = {};
    for (const key of leaderKeys) {
      const values = contributing
        .map((p) => p.results[key])
        .filter((v): v is number => v !== undefined);
      const avg = average(values);
      if (avg !== undefined) results[key] = avg;
    }

    return { date: poll.date, pollCount: contributing.length, results };
  });
}
