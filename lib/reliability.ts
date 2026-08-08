import accuracyData from "@/data/pollsterAccuracy.json";

export type ReliabilityTier = "high" | "moderate" | "lower" | "unrated";

export interface Reliability {
  tier: ReliabilityTier;
  meanAbsError?: number;
}

export const RELIABILITY_METHODOLOGY = accuracyData.methodology;

const byPollster = new Map(accuracyData.ratings.map((r) => [r.pollster, r.meanAbsError]));

// Thresholds are round numbers tied to what the error actually means in
// polling terms (a single-party sampling margin at n~1000 is roughly ±3pp),
// not a forced even split of however many pollsters happen to be rated --
// with only ~6 rated houses, ranking by raw order would manufacture
// distinctions between pollsters whose errors differ by hundredths of a point.
export function classify(meanAbsError: number): ReliabilityTier {
  if (meanAbsError <= 1.0) return "high";
  if (meanAbsError <= 2.0) return "moderate";
  return "lower";
}

export function getReliability(pollster: string): Reliability {
  const meanAbsError = byPollster.get(pollster);
  if (meanAbsError === undefined) return { tier: "unrated" };
  return { tier: classify(meanAbsError), meanAbsError };
}

export const TIER_LABEL: Record<ReliabilityTier, string> = {
  high: "High accuracy in 2023",
  moderate: "Moderate accuracy in 2023",
  lower: "Lower accuracy in 2023",
  unrated: "No 2023 pre-election poll on record",
};

// From the app's status palette -- good/warning/serious, plus a neutral for
// "no data" (never implied as a judgment, just missing information).
export const TIER_COLOR: Record<ReliabilityTier, { light: string; dark: string }> = {
  high: { light: "#0ca30c", dark: "#0ca30c" },
  moderate: { light: "#fab219", dark: "#fab219" },
  lower: { light: "#d03b3b", dark: "#e66767" },
  unrated: { light: "#c3c2b7", dark: "#52514e" },
};
