import type { PartyCode } from "./parties";

export interface PartyErrorBreakdown {
  party: PartyCode;
  polled: number;
  actual: number;
  error: number;
}

export interface PollsterRating {
  pollster: string;
  finalPollDate: string;
  sourceUrl: string | null;
  partiesCompared: number;
  meanAbsError: number;
  breakdown: PartyErrorBreakdown[];
}

export interface OmittedPollster {
  pollster: string;
  reason: string;
}

export interface PollsterAccuracyData {
  methodology: string;
  referenceElection: string;
  actualResult: Partial<Record<PartyCode, number>>;
  ratings: PollsterRating[];
  omitted: OmittedPollster[];
}
