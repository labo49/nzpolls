import type { ElectorateClassification } from "./electorateTypes";

export const CLASSIFICATION_LABEL: Record<ElectorateClassification, string> = {
  safe: "Safe",
  leaning: "Leaning",
  tossup: "Toss-up",
};

// From the app's status palette -- good/warning/neutral. A toss-up isn't a
// problem to flag (unlike "warning" elsewhere in the app), so it gets a
// neutral gray rather than red/amber.
export const CLASSIFICATION_COLOR: Record<ElectorateClassification, { light: string; dark: string }> = {
  safe: { light: "#0ca30c", dark: "#0ca30c" },
  leaning: { light: "#c98500", dark: "#eda100" },
  tossup: { light: "#6b7280", dark: "#9ca3af" },
};
