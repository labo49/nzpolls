"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsDark } from "@/components/ThemeProvider";
import { PARTIES } from "@/lib/parties";
import type { PollOfPollsPoint } from "@/lib/types";

interface ChartRow {
  date: string;
  label: string;
  [partyCode: string]: string | number | undefined;
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
          const party = PARTIES.find((p) => p.code === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-neutral-500 dark:text-neutral-400">
                {party?.name ?? entry.dataKey}
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

export default function PollChart({ series }: { series: PollOfPollsPoint[] }) {
  const isDark = useIsDark();

  const data: ChartRow[] = series.map((point) => ({
    date: point.date,
    label: formatDate(point.date),
    ...point.results,
  }));

  const latest = series[series.length - 1];
  const leadingCodes = latest
    ? PARTIES
        .map((p) => p.code)
        .filter((code) => latest.results[code] !== undefined)
        .sort((a, b) => (latest.results[b] ?? 0) - (latest.results[a] ?? 0))
        .slice(0, 3)
    : [];

  return (
    <div>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={data} margin={{ top: 8, right: 56, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke={isDark ? "#2c2c2a" : "#e1e0d9"}
            strokeWidth={1}
          />
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
          {PARTIES.map((party) => (
            <Line
              key={party.code}
              type="monotone"
              dataKey={party.code}
              name={party.name}
              stroke={isDark ? party.color.dark : party.color.light}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              label={
                leadingCodes.includes(party.code)
                  ? // Recharts' render-prop label type is a loose union (RenderableText
                    // includes null/boolean); narrowing to what this component actually
                    // reads is more readable than fighting that type.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (props: any) => {
                      const isLastPoint = props.index === data.length - 1;
                      if (!isLastPoint || props.value === undefined || props.value === null) return <g />;
                      return (
                        <text
                          x={Number(props.x ?? 0) + 6}
                          y={Number(props.y ?? 0)}
                          dy={4}
                          fontSize={11}
                          fontWeight={600}
                          fill={isDark ? party.color.dark : party.color.light}
                        >
                          {party.code}
                        </text>
                      );
                    }
                  : undefined
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
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
