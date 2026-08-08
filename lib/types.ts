import type { PartyCode } from "./parties";

export interface Poll {
  /** ISO date (YYYY-MM-DD) -- the end of the survey period, or release date if undated. */
  date: string;
  /** Human-readable date range as shown on the source page, e.g. "1-4 Aug 2026". */
  dateLabel: string;
  pollster: string;
  sourceUrl: string | null;
  sampleSize: number | null;
  results: Partial<Record<PartyCode, number>>;
  /** ISO timestamp of the scraper run that first picked up this poll. */
  firstSeenAt: string;
}

export interface PollOfPollsPoint {
  date: string;
  /** Number of individual polls (one per pollster) folded into this point. */
  pollCount: number;
  results: Partial<Record<PartyCode, number>>;
}
