import type { PartyCode } from "./parties";

export type ElectorateSeatMap = Partial<Record<PartyCode, number>>;

/**
 * Static, manually-maintained electorate-seat assumptions -- there is no
 * electorate-level polling to derive this from. Used only to (a) let a party
 * below the 5% party-vote threshold still qualify for list seats (Electoral
 * Act s191: 5% party vote OR >=1 electorate seat), and (b) floor a party's
 * total seats at the electorate seats it actually holds.
 *
 * Derived from the real 2023 electorate-by-electorate results (see
 * data/electorates.json / scripts/fetch-electorates.ts) plus the
 * electorate-relevant events visible in the scraped Wikipedia page's event
 * notes for the current parliamentary term:
 * - Te Pati Maori won 6 of the 7 Maori electorates outright in the 2023
 *   general election (Hauraki-Waikato, Tamaki Makaurau, Te Tai Hauauru, Te
 *   Tai Tokerau, Te Tai Tonga, Waiariki); Ikaroa-Rawhiti went to Labour.
 * - 6 Sep 2025: Te Pati Maori's Oriini Kaipara won the Tamaki Makaurau
 *   by-election -- succeeding the party's own Takutai Tarsh Kemp, the 2023
 *   winner, not a gain from another party. No change to the party's count.
 * - 10 Nov 2025: Takuta Ferris (Te Tai Tonga) and Mariameno Kapa-Kingi (Te
 *   Tai Tokerau) are both expelled from Te Pati Maori. Both keep their
 *   seats (no vacancy triggered), so neither counts as a Te Pati Maori
 *   electorate from this date.
 * - 11 May 2026: Kapa-Kingi separately starts her own "Te Tai Tokerau
 *   Party" -- doesn't change the electorate count, she'd already stopped
 *   counting as Te Pati Maori since the November expulsion. Neither her
 *   party nor Ferris's independent status is modeled here (not columns in
 *   the polling data, no measurable party vote).
 *   Net effect: Te Pati Maori holds 4 of the 7 Maori electorates as of
 *   today (data/electorates.json's currentMp confirms this directly).
 *
 * This is a snapshot assumption, not a live feed -- needs a manual refresh
 * after any further by-election, defection, or the 2026 election itself.
 */
export const ELECTORATE_SEATS: ElectorateSeatMap = {
  TPM: 4,
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
