"use client";

import { useMemo } from "react";
import AnimatedTimelineChart, { type TimelineSeriesDef } from "@/components/AnimatedTimelineChart";
import { useIsDark } from "@/components/ThemeProvider";
import { PARTIES } from "@/lib/parties";
import type { Milestone } from "@/lib/wikiPollScraper";
import type { PollOfPollsPoint } from "@/lib/types";

export default function PollTimelineChart({
  frames,
  milestones,
}: {
  frames: PollOfPollsPoint[];
  milestones: Milestone[];
}) {
  const isDark = useIsDark();

  const series: TimelineSeriesDef[] = useMemo(
    () => PARTIES.map((party) => ({ id: party.code, name: party.name, color: isDark ? party.color.dark : party.color.light })),
    [isDark]
  );

  const seriesData = useMemo(() => {
    const map = new Map<string, { t: number; v: number }[]>();
    for (const party of PARTIES) {
      const points = frames
        .map((frame) => {
          const v = frame.results[party.code];
          return v === undefined ? null : { t: new Date(frame.date).getTime(), v };
        })
        .filter((p): p is { t: number; v: number } => p !== null);
      map.set(party.code, points);
    }
    return map;
  }, [frames]);

  return (
    <AnimatedTimelineChart
      ariaLabel="Animated poll-of-polls trend from the 2023 election to the most recent poll"
      series={series}
      seriesData={seriesData}
      milestones={milestones}
      startingPointLabel="Starting point: the 2023 election result"
      isDark={isDark}
    />
  );
}
