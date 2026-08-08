"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsDark } from "@/components/ThemeProvider";
import { leaderParty } from "@/lib/leaders";
import { PARTY_BY_CODE } from "@/lib/parties";
import type { LeaderColumn, LeaderPoll } from "@/lib/approvalTypes";

interface ChartRow {
  date: string;
  label: string;
  [leaderKey: string]: string | number | undefined;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
}

function formatValue(value: number, signed: boolean): string {
  const fixed = value.toFixed(1);
  return signed && value > 0 ? `+${fixed}` : fixed;
}

function CustomTooltip({
  active,
  payload,
  label,
  leaders,
  suffix,
  signed,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  leaders: LeaderColumn[];
  suffix: string;
  signed: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
      <div className="mb-1 font-medium text-neutral-600 dark:text-neutral-300">{label}</div>
      <div className="space-y-0.5">
        {sorted.map((entry) => {
          const leader = leaders.find((l) => l.key === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-neutral-500 dark:text-neutral-400">{leader?.shortName ?? entry.dataKey}</span>
              <span className="ml-auto font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                {formatValue(entry.value, signed)}
                {suffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeaderTrendChart({
  leaders,
  polls,
  suffix = "%",
  signed = false,
  showZeroLine = false,
}: {
  leaders: LeaderColumn[];
  polls: LeaderPoll[];
  suffix?: string;
  signed?: boolean;
  showZeroLine?: boolean;
}) {
  const isDark = useIsDark();

  const data: ChartRow[] = polls.map((poll) => ({
    date: poll.date,
    label: formatDate(poll.date),
    ...poll.results,
  }));

  const latest = polls[polls.length - 1];
  const leadingKeys = latest
    ? leaders
        .map((l) => l.key)
        .filter((key) => latest.results[key] !== undefined)
        .sort((a, b) => (latest.results[b] ?? 0) - (latest.results[a] ?? 0))
        .slice(0, 3)
    : [];

  return (
    <div>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 8, right: 56, left: 0, bottom: 0 }}>
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
            width={36}
            tickFormatter={(v) => `${v}${suffix}`}
          />
          {showZeroLine && <ReferenceLine y={0} stroke={isDark ? "#484844" : "#c3c2b7"} strokeWidth={1} />}
          <Tooltip content={<CustomTooltip leaders={leaders} suffix={suffix} signed={signed} />} />
          {leaders.map((leader) => {
            const party = PARTY_BY_CODE[leaderParty(leader.key)];
            const color = isDark ? party.color.dark : party.color.light;
            return (
              <Line
                key={leader.key}
                type="monotone"
                dataKey={leader.key}
                name={leader.shortName}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
                label={
                  leadingKeys.includes(leader.key)
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                            fill={color}
                          >
                            {leader.shortName}
                          </text>
                        );
                      }
                    : undefined
                }
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
        {leaders.map((leader) => {
          const party = PARTY_BY_CODE[leaderParty(leader.key)];
          return (
            <li key={leader.key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: isDark ? party.color.dark : party.color.light }}
              />
              {leader.shortName}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
