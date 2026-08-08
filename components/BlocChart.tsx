"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BLOCS } from "@/lib/blocs";
import type { BlocPoint } from "@/lib/blocs";

interface ChartRow {
  date: string;
  label: string;
  [blocKey: string]: string | number | undefined;
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDark;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
      <div className="mb-1 font-medium text-neutral-600 dark:text-neutral-300">{label}</div>
      <div className="space-y-0.5">
        {sorted.map((entry) => {
          const bloc = BLOCS.find((b) => b.key === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-neutral-500 dark:text-neutral-400">
                {bloc?.label ?? entry.dataKey}
              </span>
              <span className="ml-auto font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                {entry.value.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BlocChart({ points }: { points: BlocPoint[] }) {
  const isDark = useIsDark();

  const data: ChartRow[] = points.map((point) => ({
    date: point.date,
    label: formatDate(point.date),
    ...point.values,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={isDark ? "#2c2c2a" : "#e1e0d9"} strokeWidth={1} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={{ stroke: isDark ? "#383835" : "#c3c2b7" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          {BLOCS.map((bloc) => (
            <Line
              key={bloc.key}
              type="monotone"
              dataKey={bloc.key}
              name={bloc.label}
              stroke={isDark ? bloc.color.dark : bloc.color.light}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
        {BLOCS.map((bloc) => (
          <li key={bloc.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: isDark ? bloc.color.dark : bloc.color.light }}
            />
            {bloc.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        Combined party-vote share, not a seat projection &mdash; MMP&apos;s thresholds and
        electorate seats mean vote share and seat share can diverge.
      </p>
    </div>
  );
}
