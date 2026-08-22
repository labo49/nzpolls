"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Milestone } from "@/lib/wikiPollScraper";

const W = 1000;
const H = 560;
const MARGIN = { top: 36, right: 176, bottom: 54, left: 34 };
const PLOT_LEFT = MARGIN.left;
const PLOT_RIGHT = W - MARGIN.right;
const PLOT_TOP = MARGIN.top;
const PLOT_BOTTOM = H - MARGIN.bottom;
const DURATION_MS = 26000;
const LOOP_HOLD_MS = 1800;
// Each label is two lines (entity name + value), roughly 28px tall -- the
// minimum gap has to clear the whole block, not just one text line, or
// adjacent labels visually collide exactly when two entities are close
// together (the case this nudging exists for in the first place).
const LABEL_LINE_HEIGHT = 30;
const MILESTONE_COLOR = "#f97316"; // orange-500, same in both themes -- bright against the chart's neutral axis/grid ink

export interface TimelineSeriesDef {
  id: string;
  name: string;
  color: string;
}

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
 * Before an entity's first known point it's undefined (not yet on record)
 * rather than held flat, which would imply data that was never actually
 * observed. After the last known point it holds at that value, the most
 * recent real estimate available. */
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
 * minimum gap) so entities polling close together don't render as
 * illegible stacked text. */
function resolveLabelPositions(rows: { id: string; y: number }[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    const min = sorted[i - 1].y + LABEL_LINE_HEIGHT;
    if (sorted[i].y < min) sorted[i].y = min;
  }
  return new Map(sorted.map((r) => [r.id, r.y]));
}

export default function AnimatedTimelineChart({
  ariaLabel,
  series,
  seriesData,
  milestones,
  valueSuffix = "%",
  startingPointLabel,
  isDark,
}: {
  /** Accessible description of what the chart shows. */
  ariaLabel: string;
  /** Fixed draw order (also legend order) -- never re-sorted by value, so
   * color keeps mapping to the same entity across every frame. */
  series: TimelineSeriesDef[];
  /** Points per series id, ascending by time, only where a value is known. */
  seriesData: Map<string, SeriesPoint[]>;
  milestones: Milestone[];
  valueSuffix?: string;
  /** Shown in the milestone callout before the timeline reaches the first real milestone. */
  startingPointLabel: string;
  isDark: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const playingRef = useRef(playing);
  const loopTimeoutRef = useRef<number | null>(null);
  const loopScheduledRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  function clearScheduledLoop() {
    if (loopTimeoutRef.current !== null) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
    loopScheduledRef.current = false;
  }

  useEffect(() => () => clearScheduledLoop(), []);

  const allPoints = useMemo(() => Array.from(seriesData.values()).flat(), [seriesData]);
  const tMin = useMemo(() => Math.min(...allPoints.map((p) => p.t)), [allPoints]);
  const tMax = useMemo(() => Math.max(...allPoints.map((p) => p.t)), [allPoints]);

  const yMax = useMemo(() => {
    let max = 0;
    for (const p of allPoints) max = Math.max(max, p.v);
    return Math.ceil((max + 3) / 5) * 5;
  }, [allPoints]);

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
        if (p >= 1) return 1; // holding at the end until the loop timeout below fires
        const next = p + dt / DURATION_MS;
        if (next >= 1) {
          // Pause briefly on the final frame (so the last milestone/values
          // are readable) before looping back to the start.
          if (!loopScheduledRef.current) {
            loopScheduledRef.current = true;
            loopTimeoutRef.current = window.setTimeout(() => {
              loopScheduledRef.current = false;
              if (!playingRef.current) return; // user paused during the hold
              lastTsRef.current = null;
              setProgress(0);
            }, LOOP_HOLD_MS);
          }
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
    setPlaying((p) => {
      const next = !p;
      if (next && progress >= 1) {
        clearScheduledLoop();
        setProgress(0);
      }
      return next;
    });
  }

  function scrub(value: number) {
    clearScheduledLoop();
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
  const labelTextColor = isDark ? "#e5e5e5" : "#171717";
  const bgColor = isDark ? "#0a0a0a" : "#ffffff";

  const labelRows = series
    .map((s) => {
      const v = valueAt(seriesData.get(s.id) ?? [], displayT);
      if (v === undefined) return null;
      return { id: s.id, y: yScale(v) };
    })
    .filter((r): r is { id: string; y: number } => r !== null);
  const resolvedLabelY = resolveLabelPositions(labelRows);

  return (
    <div>
      <div className="mb-3 rounded-lg border border-orange-400/50 bg-orange-500/[0.06] px-4 py-3 dark:border-orange-400/40 dark:bg-orange-500/[0.08]">
        <div className="text-xs font-medium tabular-nums text-orange-700 dark:text-orange-400">
          {formatFullDate(displayT)}
        </div>
        <div className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {currentMilestone ? (
            currentMilestone.sourceUrl ? (
              <a
                href={currentMilestone.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-orange-400/50 underline-offset-2 hover:decoration-orange-500"
              >
                {currentMilestone.label}
              </a>
            ) : (
              currentMilestone.label
            )
          ) : (
            <span className="text-neutral-500 dark:text-neutral-400">{startingPointLabel}</span>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full h-auto"
          style={{ background: bgColor }}
          onMouseMove={handleHover}
          onMouseLeave={() => setHoverT(null)}
          role="img"
          aria-label={ariaLabel}
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={yScale(v)} y2={yScale(v)} stroke={gridColor} strokeWidth={1} />
              <text x={PLOT_LEFT - 8} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill={tickTextColor}>
                {Math.round(v)}
                {valueSuffix}
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
              <g key={m.date + m.label} opacity={reached ? 1 : 0.4}>
                <line
                  x1={x}
                  x2={x}
                  y1={PLOT_TOP}
                  y2={PLOT_BOTTOM}
                  stroke={MILESTONE_COLOR}
                  strokeOpacity={reached ? 0.55 : 0.25}
                  strokeWidth={reached ? 1.5 : 1}
                  strokeDasharray="2 3"
                />
                <circle cx={x} cy={PLOT_BOTTOM} r={reached ? 3.5 : 2} fill={MILESTONE_COLOR}>
                  <title>{`${formatFullDate(t)} — ${m.label}`}</title>
                </circle>
              </g>
            );
          })}

          {series.map((s) => {
            const pts = seriesData.get(s.id) ?? [];
            const points = pts
              .filter((p) => p.t <= displayT)
              .map((p) => ({ x: xScale(p.t), y: yScale(p.v) }));
            const v = valueAt(pts, displayT);
            if (v !== undefined) {
              const lastKnownT = pts[pts.length - 1]?.t ?? -Infinity;
              const cx = xScale(Math.min(displayT, Math.max(lastKnownT, pts[0]?.t ?? displayT)));
              points.push({ x: cx, y: yScale(v) });
            }
            if (points.length < 2) return null;
            const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
            const endPoint = points[points.length - 1];
            const labelY = resolvedLabelY.get(s.id) ?? endPoint.y;
            return (
              <g key={s.id}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={endPoint.x} cy={endPoint.y} r={3.5} fill={s.color} stroke={bgColor} strokeWidth={1.5} />
                {Math.abs(labelY - endPoint.y) > 1 && (
                  <line x1={endPoint.x + 6} x2={PLOT_RIGHT + 10} y1={endPoint.y} y2={labelY} stroke={s.color} strokeOpacity={0.4} strokeWidth={1} />
                )}
                <text x={PLOT_RIGHT + 14} y={labelY + 3.5} fontSize={11.5} fill={labelTextColor}>
                  {s.name}
                </text>
                <text x={PLOT_RIGHT + 14} y={labelY + 16} fontSize={11} fontWeight={700} fill={s.color}>
                  {v !== undefined ? `${v.toFixed(1)}${valueSuffix}` : ""}
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
              stroke={tickTextColor}
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          )}
        </svg>
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
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
