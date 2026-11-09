/**
 * Manually-entered Electoral Commission enrolment/turnout figures -- not
 * scraped. electionresults.govt.nz blocks automated access (403) and
 * elections.nz serves its data via JS, not plain HTML, so this is supplied
 * by hand for the handful of electorates in the scenario groups below.
 * Covers the 2026 preliminary count so far, plus the equivalent 2023
 * figures (ordinary/preliminary votes, special votes added before the
 * final declaration, and the final turnout %) used to project how many
 * more votes each electorate is still likely to receive.
 *
 * Refresh by hand alongside the electorates this data covers -- there's no
 * automated source to re-run this from.
 */
export interface TurnoutRow {
  name: string;
  /** Enrolled voters, current (2026) roll. */
  enrolled: number;
  /** Ordinary votes counted so far in the 2026 preliminary count. */
  votes: number;
  /** 2023: ordinary (preliminary-stage) votes counted on election night. */
  ordinary2023: number;
  /** 2023: special votes added between the preliminary count and the
   * 27-day-later official declaration. */
  special2023: number;
  /** 2023: final official turnout, ordinary + special combined. */
  finalPerc2023: number;
}

export const NATIONAL_TURNOUT: TurnoutRow = {
  name: "General roll",
  enrolled: 3_677_600,
  votes: 2_418_565,
  ordinary2023: 2_268_658,
  special2023: 582_553,
  finalPerc2023: 78.2,
};

export const ELECTORATE_TURNOUT: TurnoutRow[] = [
  { name: "Wairarapa", enrolled: 61_622, votes: 41_514, ordinary2023: 38_695, special2023: 5_979, finalPerc2023: 82.66 },
  { name: "Hamilton East", enrolled: 56_465, votes: 31_391, ordinary2023: 29_431, special2023: 8_779, finalPerc2023: 77.23 },
  { name: "Hutt South", enrolled: 61_954, votes: 40_292, ordinary2023: 35_567, special2023: 7_818, finalPerc2023: 81.12 },
  { name: "Mount Roskill", enrolled: 55_773, votes: 30_606, ordinary2023: 27_269, special2023: 9_205, finalPerc2023: 71.4 },
  { name: "Te Tai Tokerau", enrolled: 46_215, votes: 28_448, ordinary2023: 20_632, special2023: 7_841, finalPerc2023: 69.06 },
];

export interface TurnoutEstimate {
  name: string;
  enrolled: number;
  votes: number;
  /** % of the roll counted so far in 2026. */
  percSoFar: number;
  /** percSoFar minus the national percSoFar -- is this electorate's count
   * running ahead of or behind the national pace? */
  diffFromNational: number;
  /** 2023's final (official) turnout %, for reference. */
  finalPerc2023: number;
  /** How many percentage points 2023's final turnout grew beyond its own
   * preliminary-stage count, once specials were added -- this electorate's
   * own historical "specials bump". */
  upliftPp2023: number;
  /** Projected 2026 final turnout %, applying this electorate's own 2023
   * uplift to its current 2026 percSoFar -- assumes the same relative
   * late-count pattern repeats, not a guarantee. */
  projectedFinalPerc: number;
  /** Projected final vote count at that turnout %. */
  projectedFinalVotes: number;
  /** Projected votes still to come: projectedFinalVotes minus votes
   * counted so far. This is the number that matters for a close race --
   * how much room is left for a small margin to move. */
  projectedOutstanding: number;
}

/** Projects how many more votes a row is likely to receive, using its own
 * 2023 "preliminary count -> final declaration" growth rate as a proxy for
 * what the remaining 2026 special votes will add. Needs `national` to
 * compute how far ahead/behind the national pace this row is running. */
export function estimateTurnout(row: TurnoutRow, national: TurnoutRow): TurnoutEstimate {
  const nationalPercSoFar = (national.votes / national.enrolled) * 100;
  const percSoFar = (row.votes / row.enrolled) * 100;

  const total2023 = row.ordinary2023 + row.special2023;
  // The 2023 enrolled figure isn't given directly -- back it out from the
  // final total votes and the known final turnout %.
  const enrolled2023 = total2023 / (row.finalPerc2023 / 100);
  const ordinaryPerc2023 = (row.ordinary2023 / enrolled2023) * 100;
  const upliftPp2023 = row.finalPerc2023 - ordinaryPerc2023;

  const projectedFinalPerc = percSoFar + upliftPp2023;
  const projectedFinalVotes = (projectedFinalPerc / 100) * row.enrolled;
  const projectedOutstanding = projectedFinalVotes - row.votes;

  return {
    name: row.name,
    enrolled: row.enrolled,
    votes: row.votes,
    percSoFar,
    diffFromNational: percSoFar - nationalPercSoFar,
    finalPerc2023: row.finalPerc2023,
    upliftPp2023,
    projectedFinalPerc,
    projectedFinalVotes,
    projectedOutstanding,
  };
}

export function findTurnoutEstimate(electorateName: string): TurnoutEstimate | null {
  const row = ELECTORATE_TURNOUT.find((r) => r.name === electorateName);
  return row ? estimateTurnout(row, NATIONAL_TURNOUT) : null;
}

export function nationalTurnoutEstimate(): TurnoutEstimate {
  return estimateTurnout(NATIONAL_TURNOUT, NATIONAL_TURNOUT);
}
