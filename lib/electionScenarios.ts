import { computeBlocSeats } from "./blocs";
import { computeSeats, houseSize, majorityThreshold, totalOverhangSeats, type SeatResult } from "./seats";
import { nationalTurnoutEstimate } from "./turnoutEstimates";
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

/** The closest-margin electorates currently won by `winner` with `runnerUp`
 * in 2nd -- i.e. the realistic pool for a `winner` -> `runnerUp` flip, not
 * just "small margin" regardless of who's actually in contention. */
function closeRacesBetween(
  electorates: ElectorateResultRow[],
  winner: PartyCode,
  runnerUp: PartyCode,
  count: number
): CloseRace[] {
  return electorates
    .filter((e): e is ElectorateResultRow & { majority: number } => e.majority !== null)
    .filter((e) => e.winnerParty === winner && e.runnerUpParty === runnerUp)
    .slice()
    .sort((a, b) => a.majority - b.majority)
    .slice(0, count)
    .map((e) => ({
      electorateName: e.electorateName,
      currentWinnerName: e.winnerName,
      currentWinnerParty: e.winnerParty as PartyCode,
      runnerUpName: e.runnerUpName,
      runnerUpParty: e.runnerUpParty as PartyCode,
      majority: e.majority,
    }));
}

export function electorateSeatMap(electorates: ElectorateResultRow[]): Partial<Record<PartyCode, number>> {
  const map: Partial<Record<PartyCode, number>> = {};
  for (const e of electorates) {
    if (e.winnerParty === "OTH") continue;
    map[e.winnerParty] = (map[e.winnerParty] ?? 0) + 1;
  }
  return map;
}

function seatsFor(
  partyVote: Partial<Record<PartyCode, number>>,
  electorateSeats: Partial<Record<PartyCode, number>>
): SeatResult[] {
  const point: PollOfPollsPoint = { date: "", pollCount: 0, results: partyVote };
  return computeSeats(point, electorateSeats);
}

/** The real preliminary result's seat allocation -- every electorate at its
 * actual current winner, real party vote, no hypothetical changes. */
export function computeBaselineSeats(
  partyVote: Partial<Record<PartyCode, number>>,
  allElectorates: ElectorateResultRow[]
): SeatResult[] {
  return seatsFor(partyVote, electorateSeatMap(allElectorates));
}

export interface ScenarioStep {
  /** Electorates (or party-vote shift) this step adds on top of the real
   * preliminary result -- cumulative within a ScenarioGroup. */
  label: string;
  seats: SeatResult[];
  houseSize: number;
  majorityThreshold: number;
  overhangSeats: number;
}

export interface ScenarioGroup {
  key: string;
  title: string;
  /** Explains *why* Parliament's size or balance moves the way it does --
   * the mechanism, not just the headline numbers. */
  mechanism: string;
  steps: ScenarioStep[];
  /** The electorate(s) this group's steps flip, for looking up turnout/
   * outstanding-votes context (lib/turnoutEstimates.ts). Empty for the
   * party-vote-shift groups, which aren't tied to one electorate. */
  electorates: string[];
}

function stepFrom(label: string, seats: SeatResult[]): ScenarioStep {
  return {
    label,
    seats,
    houseSize: houseSize(seats),
    majorityThreshold: majorityThreshold(seats),
    overhangSeats: totalOverhangSeats(seats),
  };
}

/** Cumulative electorate-flip steps: step N reassigns the N closest races
 * in `races` (closest first) from their current winner to `toParty`,
 * recomputed from the real preliminary result each time. */
function electorateFlipSteps(
  partyVote: Partial<Record<PartyCode, number>>,
  allElectorates: ElectorateResultRow[],
  races: CloseRace[],
  toParty: PartyCode
): ScenarioStep[] {
  return races.map((_, i) => {
    const flipped = new Set(races.slice(0, i + 1).map((r) => r.electorateName));
    const electorateSeats: Partial<Record<PartyCode, number>> = {};
    for (const e of allElectorates) {
      const party = flipped.has(e.electorateName) ? toParty : e.winnerParty;
      if (party === "OTH") continue;
      electorateSeats[party] = (electorateSeats[party] ?? 0) + 1;
    }
    const label =
      i === 0
        ? races[0].electorateName
        : `${races
            .slice(0, i + 1)
            .map((r) => r.electorateName)
            .join(" and ")}`;
    return stepFrom(label, seatsFor(partyVote, electorateSeats));
  });
}

/** Searches for the smallest `fromParty` -> `toParty` party-vote shift
 * (in 0.01pp steps, up to 3pp) that changes `fromParty`'s total seats or
 * the House's total size -- i.e. the point at which a vote-share slide
 * actually costs a party a seat, or grows/shrinks an overhang-protected
 * party's extra seats. Returns null if no such shift is found within 3pp
 * (the party's position is safe against a plausible special-votes swing). */
function voteShiftStep(
  partyVote: Partial<Record<PartyCode, number>>,
  electorateSeats: Partial<Record<PartyCode, number>>,
  fromParty: PartyCode,
  toParty: PartyCode,
  label: (deltaPct: number) => string
): ScenarioStep | null {
  const baseline = seatsFor(partyVote, electorateSeats);
  const baselineHouse = houseSize(baseline);
  const baselineFrom = baseline.find((s) => s.code === fromParty);
  if (!baselineFrom) return null;

  for (let delta = 0.01; delta <= 3; delta += 0.01) {
    const shifted = {
      ...partyVote,
      [fromParty]: (partyVote[fromParty] ?? 0) - delta,
      [toParty]: (partyVote[toParty] ?? 0) + delta,
    };
    const seats = seatsFor(shifted, electorateSeats);
    const house = houseSize(seats);
    const from = seats.find((s) => s.code === fromParty);
    if (house !== baselineHouse || (from && from.totalSeats !== baselineFrom.totalSeats)) {
      return stepFrom(label(Math.round(delta * 100) / 100), seats);
    }
  }
  return null;
}

export interface ElectionScenarios {
  /** Groups mirroring each distinct way the 27 Nov official count could move
   * the seat totals -- modeled individually (holding everything else at
   * today's real preliminary result), since each can happen independently
   * or in any combination; see `compound` for one example of several at
   * once. */
  groups: ScenarioGroup[];
  /** One illustrative example combining two of the mechanisms above, to
   * show how easily several small shifts together can flip the numbers --
   * a hypothetical, not a prediction. */
  compound: ScenarioGroup | null;
  /** Every electorate referenced by an electorate-flip group above, for
   * badging in the full electorate results table. */
  highlightedElectorates: string[];
  /** A combined, bloc-level question none of the single-mechanism groups
   * above answer on their own: how far would the left bloc need to move
   * to actually govern? Null if no close NAT-vs-Labour race exists to
   * combine with a party-vote swing. */
  leftMajorityPath: ScenarioGroup | null;
}

/**
 * Projects a final national party vote by splitting the *actual* remaining
 * vote pool (from lib/turnoutEstimates.ts's national projection) between
 * `favoredParties` and everyone else, rather than moving abstract
 * percentage points that aren't checked against how many votes are
 * actually left to count. `favoredShare` is the fraction (0-1) of the
 * remaining pool that goes to `favoredParties` (split between them
 * proportionally to their current vote share); the rest splits the same
 * way among every other party -- so this can never imply more movement
 * than the real outstanding vote count allows.
 */
function projectFinalVote(
  partyVote: Partial<Record<PartyCode, number>>,
  favoredParties: PartyCode[],
  favoredShare: number
): Partial<Record<PartyCode, number>> {
  const national = nationalTurnoutEstimate();
  const countedTotal = national.votes;
  const remaining = national.projectedOutstanding;
  const finalTotal = countedTotal + remaining;

  const counted: Partial<Record<PartyCode, number>> = {};
  for (const code of Object.keys(partyVote) as PartyCode[]) {
    counted[code] = ((partyVote[code] ?? 0) / 100) * countedTotal;
  }

  const otherParties = (Object.keys(partyVote) as PartyCode[]).filter((p) => !favoredParties.includes(p));
  const favoredCountedTotal = favoredParties.reduce((sum, p) => sum + (counted[p] ?? 0), 0);
  const otherCountedTotal = otherParties.reduce((sum, p) => sum + (counted[p] ?? 0), 0);

  const favoredRemaining = favoredShare * remaining;
  const otherRemaining = (1 - favoredShare) * remaining;

  const finalVote: Partial<Record<PartyCode, number>> = {};
  for (const p of favoredParties) {
    const share = favoredCountedTotal > 0 ? (counted[p] ?? 0) / favoredCountedTotal : 1 / favoredParties.length;
    finalVote[p] = (((counted[p] ?? 0) + favoredRemaining * share) / finalTotal) * 100;
  }
  for (const p of otherParties) {
    const share = otherCountedTotal > 0 ? (counted[p] ?? 0) / otherCountedTotal : 1 / otherParties.length;
    finalVote[p] = (((counted[p] ?? 0) + otherRemaining * share) / finalTotal) * 100;
  }
  return finalVote;
}

/** Projects a final vote where `redirectVotes` is moved from what
 * `fromParties` would otherwise get from the real remaining vote pool
 * (lib/turnoutEstimates.ts's national projection, split proportionally to
 * everyone by their current vote share) to what `toParties` get instead,
 * with every other party's allocation unchanged. Unlike `projectFinalVote`
 * (which splits the whole pool between one favored side and everyone
 * else), this only touches two specific parties' shares -- for scenarios
 * about particular parties shifting, like "ACT and NZ First both lose a
 * seat", rather than a whole-bloc swing. */
function redirectFinalVote(
  partyVote: Partial<Record<PartyCode, number>>,
  fromParties: PartyCode[],
  toParties: PartyCode[],
  redirectVotes: number
): Partial<Record<PartyCode, number>> {
  const national = nationalTurnoutEstimate();
  const countedTotal = national.votes;
  const remaining = national.projectedOutstanding;
  const finalTotal = countedTotal + remaining;

  const counted: Partial<Record<PartyCode, number>> = {};
  let countedSum = 0;
  for (const code of Object.keys(partyVote) as PartyCode[]) {
    const v = ((partyVote[code] ?? 0) / 100) * countedTotal;
    counted[code] = v;
    countedSum += v;
  }

  const defaultRemaining: Partial<Record<PartyCode, number>> = {};
  for (const code of Object.keys(partyVote) as PartyCode[]) {
    defaultRemaining[code] = countedSum > 0 ? remaining * ((counted[code] ?? 0) / countedSum) : 0;
  }
  const fromDefaultTotal = fromParties.reduce((sum, p) => sum + (defaultRemaining[p] ?? 0), 0);
  const toDefaultTotal = toParties.reduce((sum, p) => sum + (defaultRemaining[p] ?? 0), 0);

  const finalVote: Partial<Record<PartyCode, number>> = {};
  for (const code of Object.keys(partyVote) as PartyCode[]) {
    let rem = defaultRemaining[code] ?? 0;
    if (fromParties.includes(code) && fromDefaultTotal > 0) {
      rem -= redirectVotes * ((defaultRemaining[code] ?? 0) / fromDefaultTotal);
    }
    if (toParties.includes(code) && toDefaultTotal > 0) {
      rem += redirectVotes * ((defaultRemaining[code] ?? 0) / toDefaultTotal);
    }
    finalVote[code] = (((counted[code] ?? 0) + rem) / finalTotal) * 100;
  }
  return finalVote;
}

/** Searches for the smallest number of votes redirected from
 * `fromParties`' default share of the remaining pool to `toParties`' share
 * that satisfies `isSatisfied`. Returns null if redirecting the entire
 * amount `fromParties` would otherwise get still isn't enough. */
function findMinimumRedirect(
  partyVote: Partial<Record<PartyCode, number>>,
  electorateSeats: Partial<Record<PartyCode, number>>,
  fromParties: PartyCode[],
  toParties: PartyCode[],
  isSatisfied: (seats: SeatResult[]) => boolean
): number | null {
  const national = nationalTurnoutEstimate();
  const remaining = national.projectedOutstanding;
  const countedTotal = national.votes;
  let countedSum = 0;
  const counted: Partial<Record<PartyCode, number>> = {};
  for (const code of Object.keys(partyVote) as PartyCode[]) {
    const v = ((partyVote[code] ?? 0) / 100) * countedTotal;
    counted[code] = v;
    countedSum += v;
  }
  const fromDefaultTotal = fromParties.reduce(
    (sum, p) => sum + (countedSum > 0 ? remaining * ((counted[p] ?? 0) / countedSum) : 0),
    0
  );
  const step = Math.max(1, Math.round(fromDefaultTotal / 500));
  for (let redirect = 0; redirect <= fromDefaultTotal; redirect += step) {
    const vote = redirectFinalVote(partyVote, fromParties, toParties, redirect);
    const seats = seatsFor(vote, electorateSeats);
    if (isSatisfied(seats)) {
      return Math.round(redirect);
    }
  }
  return null;
}

/** Searches (in 0.5% steps) for the smallest share of the *actual*
 * remaining vote pool that `favoredParties` would need to get the left
 * bloc to the majority threshold. Returns null if even 100% of the
 * remaining pool isn't enough. */
function findMinimumFavoredShare(
  partyVote: Partial<Record<PartyCode, number>>,
  electorateSeats: Partial<Record<PartyCode, number>>,
  favoredParties: PartyCode[]
): number | null {
  for (let share = 0; share <= 1.001; share += 0.005) {
    const vote = projectFinalVote(partyVote, favoredParties, share);
    const seats = seatsFor(vote, electorateSeats);
    const left = computeBlocSeats(seats).LEFT ?? 0;
    if (left >= majorityThreshold(seats)) {
      return Math.round(Math.min(share, 1) * 1000) / 10; // one decimal place, as a %
    }
  }
  return null;
}

export function computeElectionScenarios(
  partyVote: Partial<Record<PartyCode, number>>,
  allElectorates: ElectorateResultRow[]
): ElectionScenarios {
  const baseElectorateSeats = electorateSeatMap(allElectorates);

  const natVulnerable = closeRacesBetween(allElectorates, "NAT", "LAB", 2);
  const natOpportunity = closeRacesBetween(allElectorates, "LAB", "NAT", 2);
  const grnOpportunity = closeRacesBetween(allElectorates, "TPM", "GRN", 1);

  const groups: ScenarioGroup[] = [];

  if (natVulnerable.length > 0) {
    groups.push({
      key: "nat-loses",
      title: "If National loses close electorates to Labour",
      mechanism:
        "National holds more electorate seats than its party vote alone would entitle it to (an overhang). Every one of those seats it loses to Labour removes an overhang seat and shrinks Parliament by one -- Labour's total is unaffected, since it simply swaps an electorate MP for a list MP.",
      steps: electorateFlipSteps(partyVote, allElectorates, natVulnerable, "LAB"),
      electorates: natVulnerable.map((r) => r.electorateName),
    });
  }

  if (natOpportunity.length > 0) {
    groups.push({
      key: "nat-gains",
      title: "If National takes close electorates from Labour",
      mechanism:
        "The reverse: every electorate National wins from Labour becomes an extra overhang seat, growing Parliament by one each time. Labour's total stays the same either way.",
      steps: electorateFlipSteps(partyVote, allElectorates, natOpportunity, "NAT"),
      electorates: natOpportunity.map((r) => r.electorateName),
    });
  }

  if (grnOpportunity.length > 0) {
    groups.push({
      key: "grn-from-tpm",
      title: "If the Greens win a Māori electorate from Te Pāti Māori",
      mechanism:
        "Te Pāti Māori also holds more electorates than its tiny party vote entitles it to. A Green win here would take a seat that's already within the Greens' proportional share, while removing one of Te Pāti Māori's overhang seats -- so Parliament shrinks even though the left bloc's combined total doesn't change.",
      steps: electorateFlipSteps(partyVote, allElectorates, grnOpportunity, "GRN"),
      electorates: grnOpportunity.map((r) => r.electorateName),
    });
  }

  const natSlip = voteShiftStep(
    partyVote,
    baseElectorateSeats,
    "NAT",
    "LAB",
    (d) => `National's party vote ${d}pp lower`
  );
  if (natSlip) {
    groups.push({
      key: "nat-vote-slip",
      title: "If National's party vote slips further",
      mechanism:
        "National could lose party-vote support without losing a single electorate MP -- its overhang simply grows, freeing up an extra list seat for whichever party gains that support (modeled here as Labour, since special votes have historically skewed left).",
      steps: [natSlip],
      electorates: [],
    });
  }

  const voteShiftSteps = [
    voteShiftStep(partyVote, baseElectorateSeats, "ACT", "LAB", (d) => `ACT's party vote ${d}pp lower`),
    voteShiftStep(partyVote, baseElectorateSeats, "NZF", "LAB", (d) => `NZ First's party vote ${d}pp lower`),
  ].filter((s): s is ScenarioStep => s !== null);
  if (voteShiftSteps.length > 0) {
    groups.push({
      key: "right-vote-slip",
      title: "If ACT or NZ First's party vote slips",
      mechanism:
        "Unlike National, neither ACT nor NZ First has an overhang cushion. A list seat either loses to the left reduces the coalition's total without Parliament growing to compensate -- the most dangerous kind of shift for the coalition's majority.",
      steps: voteShiftSteps,
      electorates: [],
    });
  }

  // A deliberately more left-favorable (and correspondingly less plausible)
  // compound example than a single close race or a single party-vote slip:
  // combines the closest National-vs-Labour flip with BOTH ACT and NZ
  // First each losing a list seat to Labour/Green -- still grounded in the
  // real remaining vote pool, not an abstract swing.
  let compound: ScenarioGroup | null = null;
  if (natVulnerable.length > 0) {
    const flippedElectorate = natVulnerable[0].electorateName;
    const electorateSeats: Partial<Record<PartyCode, number>> = {};
    for (const e of allElectorates) {
      const party = e.electorateName === flippedElectorate ? "LAB" : e.winnerParty;
      if (party === "OTH") continue;
      electorateSeats[party] = (electorateSeats[party] ?? 0) + 1;
    }
    const baselineWithFlip = seatsFor(partyVote, electorateSeats);
    const baselineAct = baselineWithFlip.find((s) => s.code === "ACT")?.totalSeats ?? 0;
    const baselineNzf = baselineWithFlip.find((s) => s.code === "NZF")?.totalSeats ?? 0;

    const fromParties: PartyCode[] = ["ACT", "NZF"];
    const toParties: PartyCode[] = ["LAB", "GRN"];
    const requiredRedirect = findMinimumRedirect(partyVote, electorateSeats, fromParties, toParties, (seats) => {
      const act = seats.find((s) => s.code === "ACT")?.totalSeats ?? 0;
      const nzf = seats.find((s) => s.code === "NZF")?.totalSeats ?? 0;
      return act < baselineAct && nzf < baselineNzf;
    });

    if (requiredRedirect !== null) {
      const national = nationalTurnoutEstimate();
      const remaining = Math.round(national.projectedOutstanding);
      const redirectSharePct = Math.round((requiredRedirect / national.projectedOutstanding) * 1000) / 10;

      compound = {
        key: "compound-example",
        title: `${flippedElectorate} flips to Labour, and both ACT and NZ First lose a seat to Labour and the Greens`,
        mechanism: `A more left-favorable example than the single mechanisms above, though not necessarily a plausible one: on top of ${flippedElectorate} flipping, this redirects ~${requiredRedirect.toLocaleString()} votes (${redirectSharePct}% of the ~${remaining.toLocaleString()} still outstanding) that ACT and NZ First would otherwise get from the remaining count toward Labour and the Greens instead -- enough for both to each drop a list seat. Grounded in the actual remaining vote pool (lib/turnoutEstimates.ts), like the scenario below -- any combination of the mechanisms above could happen at once; this is one illustrative example, not a prediction.`,
        steps: [
          stepFrom(
            `${flippedElectorate} to Labour + ACT and NZ First each lose a seat (~${requiredRedirect.toLocaleString()} votes, ${redirectSharePct}% of the remaining pool, to Labour/Green)`,
            seatsFor(redirectFinalVote(partyVote, fromParties, toParties, requiredRedirect), electorateSeats)
          ),
        ],
        electorates: [flippedElectorate],
      };
    }
  }

  const highlightedElectorates = [...natVulnerable, ...natOpportunity, ...grnOpportunity].map((r) => r.electorateName);

  let leftMajorityPath: ScenarioGroup | null = null;
  {
    const flippedElectorateSeats = {
      ...baseElectorateSeats,
      NAT: (baseElectorateSeats.NAT ?? 0) - natVulnerable.length,
      LAB: (baseElectorateSeats.LAB ?? 0) + natVulnerable.length,
    };
    const favoredParties: PartyCode[] = ["LAB", "GRN"];
    const requiredShare = findMinimumFavoredShare(partyVote, flippedElectorateSeats, favoredParties);

    const flipLabel =
      natVulnerable.length > 0
        ? `${natVulnerable.map((r) => r.electorateName).join(" and ")} flip${natVulnerable.length === 1 ? "s" : ""} to Labour`
        : "Today's real preliminary result";

    const national = nationalTurnoutEstimate();
    const remaining = Math.round(national.projectedOutstanding);
    let voteTotal = 0;
    for (const v of Object.values(partyVote)) voteTotal += v ?? 0;
    voteTotal = voteTotal || 1;
    const favoredShareSoFar = Math.round((((partyVote.LAB ?? 0) + (partyVote.GRN ?? 0)) / voteTotal) * 100);

    if (requiredShare !== null) {
      const illustrativeShare = 60;
      const requiredVotes = Math.round((requiredShare / 100) * national.projectedOutstanding);

      leftMajorityPath = {
        key: "left-majority-path",
        title: "What would it take for the left bloc to win a majority?",
        mechanism: `None of the single changes above get the left bloc (Labour + Green + Te Pāti Māori) to a majority on their own -- it also needs Labour and the Greens to win a large share of the ~${remaining.toLocaleString()} votes still to count (the Electoral Commission's own outstanding-votes estimate), not just close electorates changing hands. These rows are grounded in that actual remaining vote count (lib/turnoutEstimates.ts), not an abstract swing -- each splits the real outstanding pool between Labour+Green and everyone else, so the share needed can be checked against how many votes are actually left, rather than assuming a shift the remaining votes couldn't physically produce. A share this lopsided (more than ${requiredShare > 50 ? "half" : "a third"} of every remaining vote, nationwide) would be far outside anything specials have historically produced.`,
        steps: [
          stepFrom(flipLabel, seatsFor(partyVote, flippedElectorateSeats)),
          stepFrom(
            `...plus ${illustrativeShare}% of the remaining votes going to Labour + Green (well above their ${favoredShareSoFar}% share of the vote so far)`,
            seatsFor(projectFinalVote(partyVote, favoredParties, illustrativeShare / 100), flippedElectorateSeats)
          ),
          stepFrom(
            `...plus ${requiredShare}% of all remaining votes (~${requiredVotes.toLocaleString()} of ~${remaining.toLocaleString()}) going to Labour + Green -- the minimum that actually gets the left bloc to a majority`,
            seatsFor(projectFinalVote(partyVote, favoredParties, requiredShare / 100), flippedElectorateSeats)
          ),
        ],
        electorates: natVulnerable.map((r) => r.electorateName),
      };
    } else {
      // Not even the most extreme possible split (100% of the remaining
      // pool to Labour+Green, 0% to everyone else) reaches a majority --
      // worth stating plainly rather than just omitting the section.
      leftMajorityPath = {
        key: "left-majority-path",
        title: "What would it take for the left bloc to win a majority?",
        mechanism: `Not even the most extreme possible outcome gets there: this checks what happens if literally every one of the ~${remaining.toLocaleString()} still-outstanding votes (the Electoral Commission's own estimate) went to Labour and the Greens, with every other party getting none of them -- grounded in the actual remaining vote count (lib/turnoutEstimates.ts), not an abstract swing. Even that falls short, so a left-bloc majority isn't reachable from today's preliminary result no matter how the outstanding votes break.`,
        steps: [
          stepFrom(flipLabel, seatsFor(partyVote, flippedElectorateSeats)),
          stepFrom(
            `...plus every single remaining vote (100% of ~${remaining.toLocaleString()}) going to Labour + Green -- still not enough`,
            seatsFor(projectFinalVote(partyVote, favoredParties, 1), flippedElectorateSeats)
          ),
        ],
        electorates: natVulnerable.map((r) => r.electorateName),
      };
    }
  }

  return { groups, compound, highlightedElectorates, leftMajorityPath };
}
