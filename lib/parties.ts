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

// Order matches the Wikipedia "Table of polls" column order. Colors match
// each party's real-world branding, per explicit request, rather than the
// generic CVD-safe categorical palette -- red vs. green (Labour vs. Green)
// is a known-hard pair for deuteranopia this way, and black/gray (NZ First
// vs. Others) have no hue to separate on at all. Mitigated the same way the
// dataviz skill prescribes for this exact situation: legend always visible,
// direct end-of-line labels on the chart, a colored-dot+name tooltip, and
// the full data table below -- never color as the only cue.
// Te Pāti Māori's color wasn't specified; used their actual brand maroon.
export const PARTIES: PartyMeta[] = [
  { code: "NAT", name: "National", color: { light: "#0057B8", dark: "#4C9AFF" } },
  { code: "LAB", name: "Labour", color: { light: "#D82A20", dark: "#F0524B" } },
  { code: "GRN", name: "Green", color: { light: "#098137", dark: "#22A35C" } },
  { code: "ACT", name: "ACT", color: { light: "#FFC800", dark: "#FFD84D" } },
  { code: "NZF", name: "NZ First", color: { light: "#111111", dark: "#EDEDED" } },
  { code: "TPM", name: "Te Pāti Māori", color: { light: "#8B1E3F", dark: "#D9668A" } },
  { code: "TOP", name: "TOP", color: { light: "#14B8A6", dark: "#2DD4BF" } },
  { code: "OTH", name: "Others", color: { light: "#8A8A8A", dark: "#8F8F8F" } },
];

export const PARTY_BY_CODE: Record<PartyCode, PartyMeta> = Object.fromEntries(
  PARTIES.map((p) => [p.code, p])
) as Record<PartyCode, PartyMeta>;
