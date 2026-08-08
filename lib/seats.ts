import { PARTIES, type PartyCode } from "./parties";
import { ELECTORATE_SEATS, NOMINAL_TOTAL_SEATS, PARTY_VOTE_THRESHOLD } from "./electorates";
import type { PollOfPollsPoint } from "./types";

export interface SeatResult {
  code: PartyCode;
  votePct: number;
  electorateSeats: number;
  listSeats: number;
  totalSeats: number;
  overhang: boolean;
}

/** Modified Sainte-Lague divisor sequence: 1.4 for a party's 1st seat, then 3, 5, 7, ... */
function divisorFor(seatIndex: number): number {
  return seatIndex === 0 ? 1.4 : 2 * seatIndex + 1;
}

function sainteLague(votes: Record<string, number>, seats: number): Record<string, number> {
  const allocated: Record<string, number> = {};
  const nextSeatIndex: Record<string, number> = {};
  for (const code of Object.keys(votes)) {
    allocated[code] = 0;
    nextSeatIndex[code] = 0;
  }
  for (let i = 0; i < seats; i++) {
    let bestCode: string | null = null;
    let bestQuotient = -1;
    for (const code of Object.keys(votes)) {
      const quotient = votes[code] / divisorFor(nextSeatIndex[code]);
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestCode = code;
      }
    }
    if (bestCode === null) break;
    allocated[bestCode]++;
    nextSeatIndex[bestCode]++;
  }
  return allocated;
}

/**
 * Approximates NZ's MMP seat allocation from a poll-of-polls party-vote
 * snapshot, following the Electoral Act's actual overhang mechanism:
 * 1. Run modified Sainte-Lague once for the nominal 120 seats among
 *    qualifying parties (>=5% party vote OR holds an electorate seat).
 * 2. Any party whose electorate seats (lib/electorates.ts) exceed that
 *    120-seat entitlement keeps all of them (overhang) -- its total is
 *    fixed at its electorate count instead.
 * 3. Every other party's step-1 entitlement is untouched (the Act does not
 *    re-run the race against the larger total) -- so the House simply grows
 *    by the overhang amount, same as a real overhang election.
 * "Others" (OTH) is an aggregate of several small parties, not a real party
 * that can hold seats, so it's excluded from the allocation.
 */
export function computeSeats(point: PollOfPollsPoint): SeatResult[] {
  const qualifying = PARTIES.filter((p) => {
    if (p.code === "OTH") return false;
    const pct = point.results[p.code] ?? 0;
    const holdsElectorate = (ELECTORATE_SEATS[p.code] ?? 0) > 0;
    return pct >= PARTY_VOTE_THRESHOLD || holdsElectorate;
  });

  const votes: Record<string, number> = {};
  for (const p of qualifying) {
    votes[p.code] = point.results[p.code] ?? 0;
  }

  const entitlement = sainteLague(votes, NOMINAL_TOTAL_SEATS);

  return qualifying
    .map((p) => {
      const electorateSeats = ELECTORATE_SEATS[p.code] ?? 0;
      const baseEntitlement = entitlement[p.code] ?? 0;
      const overhang = electorateSeats > baseEntitlement;
      const totalSeats = overhang ? electorateSeats : baseEntitlement;
      return {
        code: p.code,
        votePct: point.results[p.code] ?? 0,
        electorateSeats,
        listSeats: Math.max(0, totalSeats - electorateSeats),
        totalSeats,
        overhang,
      };
    })
    .sort((a, b) => b.totalSeats - a.totalSeats);
}

export function houseSize(results: SeatResult[]): number {
  return results.reduce((sum, r) => sum + r.totalSeats, 0);
}

export function majorityThreshold(results: SeatResult[]): number {
  return Math.floor(houseSize(results) / 2) + 1;
}
