import type { ElectorateParty } from "./electorateResults";
import type { CandidateEntry } from "./electorateCandidates";

export interface ElectorateHistoryPoint {
  year: number;
  winnerName: string;
  winnerParty: ElectorateParty;
  majority: number | null;
  runnerUpParty: ElectorateParty;
  notional: boolean;
}

export type ElectorateClassification = "safe" | "leaning" | "tossup";

export interface ElectorateRecord {
  name: string;
  seatType: "general" | "maori";
  /** New or substantially redrawn by the boundary review finalized 8 Aug 2026 -- no comparable prior-election result matched by name under these boundaries. */
  isNewFor2026: boolean;
  /** Derived from the incumbent (blue-shaded) row on the 2026 candidates page, falling back to a yellow-shaded retiring MP if there's no incumbent row. Null if neither is flagged there yet. */
  currentMp: { name: string; party: ElectorateParty; note: string | null; retiring: boolean } | null;
  candidates: CandidateEntry[];
  history: ElectorateHistoryPoint[];
  classification: ElectorateClassification;
  classificationParty: ElectorateParty | null;
  trendNote: string;
}

export interface ElectoratesData {
  fetchedAt: string;
  sources: string[];
  electorates: ElectorateRecord[];
}
