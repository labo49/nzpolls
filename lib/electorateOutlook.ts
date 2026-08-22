import type { PartyCode } from "./parties";
import type { ElectorateRecord } from "./electorateTypes";

export interface PartyElectorateOutlook {
  /** Electorates where this party's candidate is the current sitting MP. */
  current: number;
  safe: number;
  leaning: number;
}

export interface ElectorateOutlookSummary {
  byParty: Partial<Record<PartyCode, PartyElectorateOutlook>>;
  /** Toss-ups aren't attributed to a party in the source classification
   * (classificationParty is null for every one on record) -- shown as a
   * single shared count rather than guessed at per party. */
  tossupCount: number;
}

/**
 * Reference context for the homepage's electorate-seat override editor:
 * how many electorates each party actually holds today, and how the
 * /electorates page's own safe/leaning/toss-up outlook breaks down per
 * party -- so filling in the override isn't a blind guess.
 */
export function summarizeElectorateOutlook(electorates: ElectorateRecord[]): ElectorateOutlookSummary {
  const byParty: Partial<Record<PartyCode, PartyElectorateOutlook>> = {};
  let tossupCount = 0;

  function bump(party: PartyCode, field: keyof PartyElectorateOutlook) {
    const entry = byParty[party] ?? { current: 0, safe: 0, leaning: 0 };
    entry[field] += 1;
    byParty[party] = entry;
  }

  for (const e of electorates) {
    if (e.currentMp) bump(e.currentMp.party, "current");

    if (e.classification === "tossup") {
      tossupCount += 1;
    } else if (e.classificationParty) {
      bump(e.classificationParty, e.classification);
    }
  }

  return { byParty, tossupCount };
}
