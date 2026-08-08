export type PartyCode =
  | "NAT"
  | "LAB"
  | "GRN"
  | "ACT"
  | "NZF"
  | "TPM"
  | "TOP"
  | "OTH";

export interface PartyMeta {
  code: PartyCode;
  name: string;
  /** Fixed categorical slot color (light/dark), assigned once and never reordered. */
  color: { light: string; dark: string };
}

// Order matches the Wikipedia "Table of polls" column order. Colors are the
// validated 8-slot categorical palette assigned in that fixed order (see
// dataviz skill) -- identity is carried by the legend/labels, not by matching
// real-world party branding.
export const PARTIES: PartyMeta[] = [
  { code: "NAT", name: "National", color: { light: "#2a78d6", dark: "#3987e5" } },
  { code: "LAB", name: "Labour", color: { light: "#eb6834", dark: "#d95926" } },
  { code: "GRN", name: "Green", color: { light: "#1baf7a", dark: "#199e70" } },
  { code: "ACT", name: "ACT", color: { light: "#eda100", dark: "#c98500" } },
  { code: "NZF", name: "NZ First", color: { light: "#e87ba4", dark: "#d55181" } },
  { code: "TPM", name: "Te Pāti Māori", color: { light: "#008300", dark: "#008300" } },
  { code: "TOP", name: "TOP", color: { light: "#4a3aa7", dark: "#9085e9" } },
  { code: "OTH", name: "Others", color: { light: "#e34948", dark: "#e66767" } },
];

export const PARTY_BY_CODE: Record<PartyCode, PartyMeta> = Object.fromEntries(
  PARTIES.map((p) => [p.code, p])
) as Record<PartyCode, PartyMeta>;
