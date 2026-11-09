import { computeBlocSeats } from "./blocs";
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

/** Shifts `deltaPp` of party vote from `fromParties` to `toParties`,
 * splitting the move proportionally to each side's current share -- a
 * uniform swing across a bloc, not a single-party shift. */
function proportionalSwing(
  partyVote: Partial<Record<PartyCode, number>>,
  fromParties: PartyCode[],
  toParties: PartyCode[],
  deltaPp: number
): Partial<Record<PartyCode, number>> {
  const fromTotal = fromParties.reduce((sum, p) => sum + (partyVote[p] ?? 0), 0);
  const toTotal = toParties.reduce((sum, p) => sum + (partyVote[p] ?? 0), 0);
  const vote = { ...partyVote };
  for (const p of fromParties) {
    vote[p] = (partyVote[p] ?? 0) - deltaPp * ((partyVote[p] ?? 0) / fromTotal);
  }
  for (const p of toParties) {
    vote[p] = (partyVote[p] ?? 0) + deltaPp * ((partyVote[p] ?? 0) / toTotal);
  }
  return vote;
}

/** Searches (in 0.05pp steps, up to 20pp) for the smallest proportional
 * swing from `fromParties` to `toParties` that gets the left bloc to the
 * majority threshold. Returns null if 20pp isn't enough (it should always
 * be, short of a near-total bloc collapse). */
function findMinimumLeftMajoritySwing(
  partyVote: Partial<Record<PartyCode, number>>,
  electorateSeats: Partial<Record<PartyCode, number>>,
  fromParties: PartyCode[],
  toParties: PartyCode[]
): number | null {
  for (let delta = 0; delta <= 20; delta += 0.05) {
    const vote = proportionalSwing(partyVote, fromParties, toParties, delta);
    const seats = seatsFor(vote, electorateSeats);
    const left = computeBlocSeats(seats).LEFT ?? 0;
    if (left >= majorityThreshold(seats)) {
      return Math.round(delta * 100) / 100;
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

  let compound: ScenarioGroup | null = null;
  if (natVulnerable.length > 0 && voteShiftSteps.length > 0) {
    const flippedElectorate = natVulnerable[0].electorateName;
    const nzfShift = voteShiftStep(partyVote, baseElectorateSeats, "NZF", "GRN", () => "");
    if (nzfShift) {
      const electorateSeats: Partial<Record<PartyCode, number>> = {};
      for (const e of allElectorates) {
        const party = e.electorateName === flippedElectorate ? "LAB" : e.winnerParty;
        if (party === "OTH") continue;
        electorateSeats[party] = (electorateSeats[party] ?? 0) + 1;
      }
      let combinedVote: Partial<Record<PartyCode, number>> | null = null;
      for (let delta = 0.01; delta <= 3; delta += 0.01) {
        const vote = {
          ...partyVote,
          NZF: (partyVote.NZF ?? 0) - delta,
          GRN: (partyVote.GRN ?? 0) + delta,
        };
        const seats = seatsFor(vote, electorateSeats);
        const nzf = seats.find((s) => s.code === "NZF");
        const baselineNzf = seatsFor(partyVote, electorateSeats).find((s) => s.code === "NZF");
        if (nzf && baselineNzf && nzf.totalSeats !== baselineNzf.totalSeats) {
          combinedVote = vote;
          break;
        }
      }
      if (combinedVote) {
        compound = {
          key: "compound-example",
          title: `${flippedElectorate} flips to Labour, and NZ First's party vote slips to the Greens`,
          mechanism:
            "Any combination of the mechanisms above could happen at once -- this is one illustrative example, not a prediction, showing how a close electorate and a small party-vote shift together can move both Parliament's size and who holds a majority within it.",
          steps: [stepFrom(`${flippedElectorate} to Labour + NZ First's vote to the Greens`, seatsFor(combinedVote, electorateSeats))],
          electorates: [flippedElectorate],
        };
      }
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
    const fromParties: PartyCode[] = ["NAT", "ACT", "NZF"];
    const toParties: PartyCode[] = ["LAB", "GRN"];
    const requiredSwing = findMinimumLeftMajoritySwing(partyVote, flippedElectorateSeats, fromParties, toParties);

    if (requiredSwing !== null) {
      const flipLabel =
        natVulnerable.length > 0
          ? `${natVulnerable.map((r) => r.electorateName).join(" and ")} flip${natVulnerable.length === 1 ? "s" : ""} to Labour`
          : "Today's real preliminary result";
      const realisticSwingPp = 1.5;

      leftMajorityPath = {
        key: "left-majority-path",
        title: "What would it take for the left bloc to win a majority?",
        mechanism: `None of the single changes above get the left bloc (Labour + Green + Te Pāti Māori) to a majority on their own -- it also needs party vote to move from the right bloc to the left, not just close electorates changing hands. Below: today's closest National-vs-Labour races flipping to Labour, then a modest swing of the kind specials have historically produced, then the swing actually needed to govern -- so the gap is visible, not just asserted.`,
        steps: [
          stepFrom(flipLabel, seatsFor(partyVote, flippedElectorateSeats)),
          stepFrom(
            `...plus a modest ${realisticSwingPp}pp swing from the right bloc to the left`,
            seatsFor(proportionalSwing(partyVote, fromParties, toParties, realisticSwingPp), flippedElectorateSeats)
          ),
          stepFrom(
            `...plus a ${requiredSwing}pp swing -- the minimum that actually gets the left bloc to a majority`,
            seatsFor(proportionalSwing(partyVote, fromParties, toParties, requiredSwing), flippedElectorateSeats)
          ),
        ],
        electorates: natVulnerable.map((r) => r.electorateName),
      };
    }
  }

  return { groups, compound, highlightedElectorates, leftMajorityPath };
}
