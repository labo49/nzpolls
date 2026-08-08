import type { ElectorateParty } from "./electorateResults";

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
  isNewSeat: boolean;
  currentMp: { name: string; party: ElectorateParty; note: string | null };
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
