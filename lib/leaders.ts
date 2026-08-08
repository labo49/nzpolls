import type { PartyCode } from "./parties";

// Keyed by the leader's full name (from the Wikipedia link's title attribute,
// e.g. "Christopher Luxon"), not the table's short display name ("Luxon") --
// stable across a table's display-text quirks. Update when a party changes
// leader (a leadership spill, retirement, etc.); an unmapped name just falls
// back to a neutral color rather than breaking the page.
export const LEADER_PARTY: Record<string, PartyCode | "OTH"> = {
  "Christopher Luxon": "NAT",
  "Chris Hipkins": "LAB",
  "Chlöe Swarbrick": "GRN",
  "David Seymour": "ACT",
  "Winston Peters": "NZF",
};

export function leaderParty(fullName: string): PartyCode | "OTH" {
  return LEADER_PARTY[fullName] ?? "OTH";
}
