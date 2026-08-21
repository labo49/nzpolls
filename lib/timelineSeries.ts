import { actualPolls, computePollOfPolls, isElectionResult } from "./pollOfPolls";
import type { Poll, PollOfPollsPoint } from "./types";

/**
 * The timeline chart's frame series: the actual 2023 election result as the
 * starting anchor (not a poll -- computePollOfPolls excludes it, since it's
 * ground truth rather than something to average with other surveys), then
 * the standard poll-of-polls rolling average at every subsequent real poll
 * date. Always built from every poll on record (no pollster/recency
 * filtering) -- this chart's whole point is the full multi-year picture.
 */
export function buildTimelineFrames(polls: Poll[]): PollOfPollsPoint[] {
  const electionResult = polls.find(isElectionResult);
  const trend = computePollOfPolls(actualPolls(polls));

  if (!electionResult) return trend;
  return [{ date: electionResult.date, pollCount: 1, results: electionResult.results }, ...trend];
}
