import type { PartyCode } from "./parties";

export type ElectorateSeatMap = Partial<Record<PartyCode, number>>;

/**
 * Static, manually-maintained electorate-seat assumptions -- there is no
 * electorate-level polling to derive this from. Used only to (a) let a party
 * below the 5% party-vote threshold still qualify for list seats (Electoral
 * Act s191: 5% party vote OR >=1 electorate seat), and (b) floor a party's
 * total seats at the electorate seats it actually holds.
 *
 * Derived from the 2023 election result plus the two electorate-relevant
 * events visible in the scraped Wikipedia page's event notes:
 * - 6 Sep 2025: Te Pati Maori's Oriini Kaipara won the Tamaki Makaurau
 *   by-election, giving the party all 7 Maori electorates.
 * - 11 May 2026: Te Pati Maori's Mariameno Kapa-Kingi (MP for Te Tai
 *   Tokerau) left to start her own "Te Tai Tokerau Party". She keeps the
 *   seat (no vacancy was triggered), so it no longer counts as a Te Pati
 *   Maori electorate -- net effect, Te Pati Maori holds 6 of the 7 Maori
 *   electorates as of today. Te Tai Tokerau Party itself isn't modeled here
 *   (it isn't a column in the polling data and has no measurable party vote).
 *
 * This is a snapshot assumption, not a live feed -- needs a manual refresh
 * after any further by-election, defection, or the 2026 election itself.
 */
export const ELECTORATE_SEATS: ElectorateSeatMap = {
  TPM: 6,
  ACT: 1, // Epsom
};

/** Nominal House size before any overhang is added -- see lib/seats.ts. */
export const NOMINAL_TOTAL_SEATS = 120;

/**
 * The real, fixed total number of electorates in Parliament. Only ACT's and
 * Te Pati Maori's are tracked above by default (the two cases that actually
 * change which parties qualify for list seats) -- the rest sit with
 * National and Labour in reality, but aren't itemized here since there's no
 * scraped source for exactly how many each holds. Because entitlement
 * already exceeds realistic electorate counts for those two parties, this
 * gap doesn't change the seat *totals* computed today, but it does mean the
 * default electorate map only accounts for 7 of the 71 real electorates --
 * see ElectorateEditor's completeness indicator.
 */
export const TOTAL_ELECTORATE_SEATS = 71;

export const PARTY_VOTE_THRESHOLD = 5;

export function totalAllocatedElectorateSeats(map: ElectorateSeatMap): number {
  return Object.values(map).reduce((sum, n) => sum + (n ?? 0), 0);
}
