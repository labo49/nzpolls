"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useIsDark } from "@/components/ThemeProvider";
import { PARTIES } from "@/lib/parties";
import type { Milestone } from "@/lib/wikiPollScraper";
import type { PollOfPollsPoint } from "@/lib/types";

const W = 1000;
const H = 560;
const MARGIN = { top: 36, right: 176, bottom: 54, left: 34 };
const PLOT_LEFT = MARGIN.left;
const PLOT_RIGHT = W - MARGIN.right;
const PLOT_TOP = MARGIN.top;
const PLOT_BOTTOM = H - MARGIN.bottom;
const DURATION_MS = 26000;
// Each label is two lines (party name + value), roughly 28px tall -- the
// minimum gap has to clear the whole block, not just one text line, or
// adjacent labels visually collide exactly when two parties are close in
// the polls (the case this nudging exists for in the first place).
const LABEL_LINE_HEIGHT = 30;

interface SeriesPoint {
  t: number;
  v: number;
}

function formatAxisDate(t: number): string {
  return new Date(t).toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
}

function formatFullDate(t: number): string {
  return new Date(t).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

/** Value at time `t`, interpolating between the two bracketing known points.
 * Before the party's first known point it's undefined (not yet on record --
 * e.g. TOP wasn't reported for several months after the 2023 election, so it
 * simply hasn't joined the race yet) rather than held flat, which would
 * imply data that was never actually observed. After the last known point
 * it holds at that value, the most recent real estimate available. */
function valueAt(series: SeriesPoint[], t: number): number | undefined {
  if (series.length === 0 || t < series[0].t) return undefined;
  if (t >= series[series.length - 1].t) return series[series.length - 1].v;
  for (let i = 1; i < series.length; i++) {
    if (series[i].t >= t) {
      const a = series[i - 1];
      const b = series[i];
      const frac = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * frac;
    }
  }
  return series[series.length - 1].v;
}

/** Nudges overlapping end-of-line labels apart vertically (top to bottom,
 * minimum gap) so close-polling parties (National/Labour, most of this
 * term) don't render as illegible stacked text. */
function resolveLabelPositions(rows: { code: string; y: number }[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    const min = sorted[i - 1].y + LABEL_LINE_HEIGHT;
    if (sorted[i].y < min) sorted[i].y = min;
  }
  return new Map(sorted.map((r) => [r.code, r.y]));
}

export default function PollTimelineChart({
  frames,
  milestones,
}: {
  frames: PollOfPollsPoint[];
  milestones: Milestone[];
}) {
  const isDark = useIsDark();
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const tMin = useMemo(() => new Date(frames[0].date).getTime(), [frames]);
  const tMax = useMemo(() => new Date(frames[frames.length - 1].date).getTime(), [frames]);

  const seriesByParty = useMemo(() => {
    const map = new Map<string, SeriesPoint[]>();
    for (const party of PARTIES) {
      const points: SeriesPoint[] = [];
      for (const frame of frames) {
        const v = frame.results[party.code];
        if (v !== undefined) points.push({ t: new Date(frame.date).getTime(), v });
      }
      map.set(party.code, points);
    }
    return map;
  }, [frames]);

  const yMax = useMemo(() => {
    let max = 0;
    for (const series of seriesByParty.values()) {
      for (const p of series) max = Math.max(max, p.v);
    }
    return Math.ceil((max + 3) / 5) * 5;
  }, [seriesByParty]);

  const xScale = (t: number) => PLOT_LEFT + ((t - tMin) / (tMax - tMin || 1)) * (PLOT_RIGHT - PLOT_LEFT);
  const yScale = (v: number) => PLOT_BOTTOM - (v / yMax) * (PLOT_BOTTOM - PLOT_TOP);

  const cursorT = tMin + progress * (tMax - tMin);

  const milestonesInRange = useMemo(
    () => milestones.filter((m) => {
      const t = new Date(m.date).getTime();
      return t >= tMin && t <= tMax;
    }),
    [milestones, tMin, tMax]
  );

  const currentMilestone = useMemo(() => {
    let latest: Milestone | null = null;
    for (const m of milestonesInRange) {
      if (new Date(m.date).getTime() <= cursorT) latest = m;
    }
    return latest;
  }, [milestonesInRange, cursorT]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
      return;
    }
    const step = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setProgress((p) => {
        const next = p + dt / DURATION_MS;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  function togglePlay() {
    if (progress >= 1) setProgress(0);
    setPlaying((p) => !p);
  }

  function scrub(value: number) {
    setPlaying(false);
    setProgress(value / 1000);
  }

  function handleHover(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const px = xFrac * W;
    if (px < PLOT_LEFT || px > PLOT_RIGHT) {
      setHoverT(null);
      return;
    }
    const t = tMin + ((px - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * (tMax - tMin);
    setHoverT(Math.min(t, cursorT));
  }

  const displayT = hoverT ?? cursorT;

  const xTicks = useMemo(() => {
    const count = 6;
    return Array.from({ length: count + 1 }, (_, i) => tMin + (i / count) * (tMax - tMin));
  }, [tMin, tMax]);

  const yTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count + 1 }, (_, i) => (i / count) * yMax);
  }, [yMax]);

  const axisColor = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tickTextColor = isDark ? "#8a8a8a" : "#737373";
  const bgColor = isDark ? "#0a0a0a" : "#ffffff";

  const labelRows = PARTIES.map((party) => {
    const series = seriesByParty.get(party.code) ?? [];
    const v = valueAt(series, displayT);
    if (v === undefined) return null;
    return { code: party.code as string, y: yScale(v) };
  }).filter((r): r is { code: string; y: number } => r !== null);
  const resolvedLabelY = resolveLabelPositions(labelRows);

  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full h-auto"
          style={{ background: bgColor }}
          onMouseMove={handleHover}
          onMouseLeave={() => setHoverT(null)}
          role="img"
          aria-label="Animated poll-of-polls trend from the 2023 election to the most recent poll"
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={yScale(v)} y2={yScale(v)} stroke={gridColor} strokeWidth={1} />
              <text x={PLOT_LEFT - 8} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill={tickTextColor}>
                {Math.round(v)}%
              </text>
            </g>
          ))}

          <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={PLOT_BOTTOM} y2={PLOT_BOTTOM} stroke={axisColor} strokeWidth={1} />
          {xTicks.map((t) => (
            <text key={t} x={xScale(t)} y={PLOT_BOTTOM + 18} textAnchor="middle" fontSize={10} fill={tickTextColor}>
              {formatAxisDate(t)}
            </text>
          ))}

          {milestonesInRange.map((m) => {
            const t = new Date(m.date).getTime();
            const x = xScale(t);
            const reached = t <= cursorT;
            return (
              <g key={m.date + m.label} opacity={reached ? 1 : 0.35}>
                <line
                  x1={x}
                  x2={x}
                  y1={PLOT_TOP}
                  y2={PLOT_BOTTOM}
                  stroke={isDark ? "#ffffff" : "#000000"}
                  strokeOpacity={reached ? 0.16 : 0.08}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <circle cx={x} cy={PLOT_BOTTOM} r={reached ? 3 : 2} fill={reached ? "#f97316" : tickTextColor}>
                  <title>{`${formatFullDate(t)} — ${m.label}`}</title>
                </circle>
              </g>
            );
          })}

          {PARTIES.map((party) => {
            const series = seriesByParty.get(party.code) ?? [];
            const points = series
              .filter((p) => p.t <= displayT)
              .map((p) => ({ x: xScale(p.t), y: yScale(p.v) }));
            const v = valueAt(series, displayT);
            if (v !== undefined) {
              const lastKnownT = series[series.length - 1]?.t ?? -Infinity;
              const cx = xScale(Math.min(displayT, Math.max(lastKnownT, series[0]?.t ?? displayT)));
              points.push({ x: cx, y: yScale(v) });
            }
            if (points.length < 2) return null;
            const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
            const color = isDark ? party.color.dark : party.color.light;
            const endPoint = points[points.length - 1];
            const labelY = resolvedLabelY.get(party.code) ?? endPoint.y;
            return (
              <g key={party.code}>
                <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={endPoint.x} cy={endPoint.y} r={3.5} fill={color} stroke={bgColor} strokeWidth={1.5} />
                {Math.abs(labelY - endPoint.y) > 1 && (
                  <line x1={endPoint.x + 6} x2={PLOT_RIGHT + 10} y1={endPoint.y} y2={labelY} stroke={color} strokeOpacity={0.4} strokeWidth={1} />
                )}
                <text x={PLOT_RIGHT + 14} y={labelY + 3.5} fontSize={11.5} fill={isDark ? "#e5e5e5" : "#171717"}>
                  {party.name}
                </text>
                <text x={PLOT_RIGHT + 14} y={labelY + 16} fontSize={11} fontWeight={700} fill={color}>
                  {v !== undefined ? `${v.toFixed(1)}%` : ""}
                </text>
              </g>
            );
          })}

          {hoverT !== null && (
            <line
              x1={xScale(hoverT)}
              x2={xScale(hoverT)}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke={isDark ? "#ffffff" : "#000000"}
              strokeOpacity={0.25}
              strokeWidth={1}
            />
          )}
        </svg>

        <div className="border-t border-black/10 bg-black/[0.02] px-4 py-2 text-xs text-neutral-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-400">
          <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
            {formatFullDate(displayT)}
          </span>
          {currentMilestone && (
            <>
              {" — "}
              {currentMilestone.sourceUrl ? (
                <a
                  href={currentMilestone.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:decoration-neutral-600"
                >
                  {currentMilestone.label}
                </a>
              ) : (
                currentMilestone.label
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-black/5 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/5"
        >
          {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => scrub(Number(e.target.value))}
          className="h-1.5 flex-1 min-w-[160px] accent-neutral-800 dark:accent-neutral-200"
          aria-label="Timeline scrubber"
        />
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
        {PARTIES.map((party) => (
          <li key={party.code} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: isDark ? party.color.dark : party.color.light }}
            />
            {party.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
