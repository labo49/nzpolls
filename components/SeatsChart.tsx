"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { BLOCS } from "@/lib/blocs";
import type { BlocKey } from "@/lib/blocs";

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
    label: bloc.label,
    seats: blocSeats[bloc.key] ?? 0,
    color: isDark ? bloc.color.dark : bloc.color.light,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 24, right: 40, left: 8, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke={isDark ? "#2c2c2a" : "#e1e0d9"} strokeWidth={1} />
          <XAxis
            type="number"
            domain={[0, Math.max(houseSize, majority * 2 - houseSize) + 5]}
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={{ stroke: isDark ? "#383835" : "#c3c2b7" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={190}
            tick={{ fontSize: 12, fill: isDark ? "#c3c2b7" : "#52514e" }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine
            x={majority}
            stroke={isDark ? "#898781" : "#52514e"}
            strokeDasharray="4 4"
            label={{
              value: `${majority} for a majority`,
              position: "top",
              fontSize: 11,
              fill: isDark ? "#c3c2b7" : "#52514e",
            }}
          />
          <Bar dataKey="seats" radius={[0, 4, 4, 0]} barSize={28}>
            {data.map((row) => (
              <Cell key={row.key} fill={row.color} />
            ))}
            <LabelList
              dataKey="seats"
              position="right"
              fontSize={12}
              fontWeight={600}
              fill={isDark ? "#ffffff" : "#0b0b0b"}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        Projected seats (out of {houseSize}) from today&apos;s poll of polls, using New Zealand&apos;s modified
        Sainte-Laguë MMP allocation. Assumes today&apos;s electorate seats are unchanged at the next election
        &mdash; see the methodology note below.
      </p>
    </div>
  );
}
