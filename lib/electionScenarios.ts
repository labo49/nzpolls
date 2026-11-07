import { computeSeats, houseSize, majorityThreshold, totalOverhangSeats, type SeatResult } from "./seats";
import type { PartyCode } from "./parties";
import type { ElectorateResultRow } from "./electorateResults";
import type { PollOfPollsPoint } from "./types";

export interface CloseRace {
  electorateName: string;
  currentWinnerName: string;
  currentWinnerParty: PartyCode;
  runnerUpName: string;
  runnerUpParty: PartyCode;
  majority: number;
}

/** The N tightest-margin electorates where `involvingParty` is realistically
 * in contention (either the current winner or the runner-up) -- the ones
 * most likely to flip to them once special votes (counted by 27 Nov) are
 * added to the preliminary count. A seat where that party isn't even in
 * 1st or 2nd (e.g. a Green-vs-Labour race) isn't a realistic gain for it
 * regardless of how close the margin is. */
export function findClosestRaces(
  electorates: ElectorateResultRow[],
  count: number,
  involvingParty: PartyCode
): CloseRace[] {
  return electorates
    .filter((e): e is ElectorateResultRow & { majority: number } => e.majority !== null)
    .filter((e) => e.winnerParty === involvingParty || e.runnerUpParty === involvingParty)
    .slice()
    .sort((a, b) => a.majority - b.majority)
    .slice(0, count)
    .map((e) => ({
      electorateName: e.electorateName,
      currentWinnerName: e.winnerName,
      currentWinnerParty: e.winnerParty,
      runnerUpName: e.runnerUpName,
      runnerUpParty: e.runnerUpParty,
      majority: e.majority,
    }));
}

export interface ElectionScenario {
  /** How many of the close races this scenario awards to National -- the
   * closest-margin ones first (see computeElectionScenarios), regardless
   * of who's actually in second place there: a deliberate hypothetical
   * stress test ("if these break National's way"), not a prediction. */
  nationalWins: number;
  seats: SeatResult[];
  houseSize: number;
  majorityThreshold: number;
  overhangSeats: number;
  /** Which close races this scenario actually changes from their real
   * preliminary winner, so the assumption behind each scenario is visible
   * rather than a black box. */
  flippedToNational: CloseRace[];
}

/**
 * Builds one scenario per possible National win-count (closeRaces.length
 * down to 0) among the given close races, each with every other electorate
 * held at its real preliminary winner and national party vote held fixed
 * at the real result -- isolating exactly what these few seats would
 * change about the overall seat allocation, overhang, and majority
 * threshold, via the same Sainte-Lague computeSeats() the rest of the site
 * uses for poll-based seat projections.
 */
export function computeElectionScenarios(
  partyVote: Partial<Record<PartyCode, number>>,
  allElectorates: ElectorateResultRow[],
  closeRaces: CloseRace[]
): ElectionScenario[] {
  const point: PollOfPollsPoint = { date: "", pollCount: 0, results: partyVote };
  // Closest-margin first, so each step down from "all to National" gives up
  // the race that was least in National's favour to begin with.
  const orderedRaces = [...closeRaces].sort((a, b) => a.majority - b.majority);

  const scenarios: ElectionScenario[] = [];
  for (let n = orderedRaces.length; n >= 0; n--) {
    const toNational = new Set(orderedRaces.slice(0, n).map((r) => r.electorateName));
    const flippedToNational = orderedRaces.filter((r) => toNational.has(r.electorateName) && r.currentWinnerParty !== "NAT");

    const electorateSeats: Partial<Record<PartyCode, number>> = {};
    for (const e of allElectorates) {
      const party = toNational.has(e.electorateName) ? "NAT" : e.winnerParty;
      electorateSeats[party] = (electorateSeats[party] ?? 0) + 1;
    }

    const seats = computeSeats(point, electorateSeats);
    scenarios.push({
      nationalWins: n,
      seats,
      houseSize: houseSize(seats),
      majorityThreshold: majorityThreshold(seats),
      overhangSeats: totalOverhangSeats(seats),
      flippedToNational,
    });
  }
  return scenarios;
}
