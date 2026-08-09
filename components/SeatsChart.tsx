"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useIsDark } from "@/components/ThemeProvider";
import { BLOCS } from "@/lib/blocs";
import type { BlocKey } from "@/lib/blocs";

interface SliceLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  value?: number;
}

function renderSliceLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value }: SliceLabelProps) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill="#ffffff">
      {value}
    </text>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="text-neutral-500 dark:text-neutral-400">{entry.name}</span>
        <span className="ml-auto font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
          {entry.value} seats
        </span>
      </div>
    </div>
  );
}

export default function SeatsChart({
  blocSeats,
  houseSize,
  majority,
}: {
  blocSeats: Partial<Record<BlocKey, number>>;
  houseSize: number;
  majority: number;
}) {
  const isDark = useIsDark();

  const data = BLOCS.map((bloc) => ({
    key: bloc.key,
    name: bloc.label,
    seats: blocSeats[bloc.key] ?? 0,
    color: isDark ? bloc.color.dark : bloc.color.light,
  })).filter((row) => row.seats > 0);

  const leader = [...data].sort((a, b) => b.seats - a.seats)[0];
  const leaderHasMajority = leader && leader.seats >= majority;

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="seats"
              nameKey="name"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              isAnimationActive={false}
              stroke={isDark ? "#1a1a19" : "#fcfcfb"}
              strokeWidth={2}
              label={renderSliceLabel}
              labelLine={false}
            >
              {data.map((row) => (
                <Cell key={row.key} fill={row.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
            {houseSize}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">seats</div>
        </div>
      </div>
      <ul className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
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
      <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
        {majority} seats needed for a majority.{" "}
        {leaderHasMajority
          ? `${leader.name} would govern alone.`
          : "No bloc reaches a majority alone at this snapshot."}
      </p>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
        Projected seats (out of {houseSize}) from today&apos;s poll of polls, using New Zealand&apos;s modified
        Sainte-Laguë MMP allocation. Assumes today&apos;s electorate seats are unchanged at the next election
        &mdash; see the methodology note below.
      </p>
    </div>
  );
}
