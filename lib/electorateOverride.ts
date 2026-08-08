import type { ElectorateSeatMap } from "./electorates";

const STORAGE_KEY = "nzpolls:electorateOverride";

/** Browser-local only -- there's no backend to submit this to, so "submit"
 * means saving it in this browser for next time, not publishing it anywhere. */
export function loadElectorateOverride(): ElectorateSeatMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ElectorateSeatMap;
  } catch {
    return null;
  }
}

export function saveElectorateOverride(map: ElectorateSeatMap): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function clearElectorateOverride(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
