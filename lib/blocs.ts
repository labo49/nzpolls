import type { PartyCode } from "./parties";
import type { PollOfPollsPoint } from "./types";

export type BlocKey = "RIGHT" | "LEFT" | "TOP";

export interface BlocMeta {
  key: BlocKey;
  label: string;
  members: PartyCode[];
  color: { light: string; dark: string };
}

// Colors picked (and validated for CVD-safety as a 3-way all-pairs set, see
// dataviz skill) to match how they're described: right-leaning bloc in blue,
// left-leaning bloc in red, TOP standalone in purple.
export const BLOCS: BlocMeta[] = [
  {
    key: "RIGHT",
    label: "National + ACT + NZ First",
    members: ["NAT", "ACT", "NZF"],
    color: { light: "#2a78d6", dark: "#3987e5" },
  },
  {
    key: "LEFT",
    label: "Labour + Green + Te Pāti Māori",
    members: ["LAB", "GRN", "TPM"],
    color: { light: "#e34948", dark: "#e66767" },
  },
  {
    key: "TOP",
    label: "The Opportunities Party",
    members: ["TOP"],
    color: { light: "#4a3aa7", dark: "#7b2fbf" },
  },
];

export interface BlocPoint {
  date: string;
  values: Partial<Record<BlocKey, number>>;
}

export function computeBlocs(series: PollOfPollsPoint[]): BlocPoint[] {
  return series.map((point) => {
    const values: Partial<Record<BlocKey, number>> = {};
    for (const bloc of BLOCS) {
      const present = bloc.members.filter((code) => point.results[code] !== undefined);
      if (present.length === 0) continue;
      const sum = present.reduce((acc, code) => acc + (point.results[code] ?? 0), 0);
      values[bloc.key] = Math.round(sum * 10) / 10;
    }
    return { date: point.date, values };
  });
}
