import type { ElectorateClassification } from "./electorateTypes";

export const CLASSIFICATION_LABEL: Record<ElectorateClassification, string> = {
  safe: "Safe",
  leaning: "Leaning",
  tossup: "Toss-up",
};

// From the app's status palette -- good/warning/neutral. A toss-up isn't a
// problem to flag (unlike "warning" elsewhere in the app), so it gets a
// neutral gray rather than red/amber.
// Light values darkened from the original #0ca30c/#c98500 -- both read fine
// against white at a glance but measured under 3.5:1 contrast, short of
// WCAG AA's 4.5:1 for normal text. Dark values already clear it comfortably.
export const CLASSIFICATION_COLOR: Record<ElectorateClassification, { light: string; dark: string }> = {
  safe: { light: "#087f08", dark: "#0ca30c" },
  leaning: { light: "#a15c00", dark: "#eda100" },
  tossup: { light: "#6b7280", dark: "#9ca3af" },
};
