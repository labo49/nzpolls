import { actualPolls } from "./pollOfPolls";
import type { Poll } from "./types";

const DEFAULT_WINDOW_DAYS = 7;

/** Real surveys first scraped within the trailing window, most recent first. */
export function recentlyAddedPolls(polls: Poll[], windowDays = DEFAULT_WINDOW_DAYS): Poll[] {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return actualPolls(polls)
    .filter((p) => new Date(p.firstSeenAt).getTime() >= cutoff)
    .slice()
    .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
}
