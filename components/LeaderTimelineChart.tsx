"use client";

import { useMemo } from "react";
import AnimatedTimelineChart, { type TimelineSeriesDef } from "@/components/AnimatedTimelineChart";
import { useIsDark } from "@/components/ThemeProvider";
import { leaderParty } from "@/lib/leaders";
import { computeLeaderTrend } from "@/lib/leaderTimelineSeries";
import { PARTY_BY_CODE } from "@/lib/parties";
import type { Milestone } from "@/lib/wikiPollScraper";
import type { LeaderColumn, LeaderPoll } from "@/lib/approvalTypes";

export default function LeaderTimelineChart({
  leaders,
  polls,
  milestones,
}: {
  leaders: LeaderColumn[];
  polls: LeaderPoll[];
  milestones: Milestone[];
}) {
  const isDark = useIsDark();

  const trend = useMemo(
    () => computeLeaderTrend(polls, leaders.map((l) => l.key)),
    [polls, leaders]
  );

  // Colored by the leader's own party, same categorical mapping the
  // Approval Ratings page already uses -- a leader's line is always their
  // party's color, never a separately-assigned hue.
  const series: TimelineSeriesDef[] = useMemo(
    () =>
      leaders.map((leader) => {
        const party = PARTY_BY_CODE[leaderParty(leader.key)];
        return { id: leader.key, name: leader.shortName, color: isDark ? party.color.dark : party.color.light };
      }),
    [leaders, isDark]
  );

  const seriesData = useMemo(() => {
    const map = new Map<string, { t: number; v: number }[]>();
    for (const leader of leaders) {
      const points = trend
        .map((frame) => {
          const v = frame.results[leader.key];
          return v === undefined ? null : { t: new Date(frame.date).getTime(), v };
        })
        .filter((p): p is { t: number; v: number } => p !== null);
      map.set(leader.key, points);
    }
    return map;
  }, [trend, leaders]);

  return (
    <AnimatedTimelineChart
      ariaLabel="Animated preferred Prime Minister trend from the earliest recorded poll to the most recent"
      series={series}
      seriesData={seriesData}
      milestones={milestones}
      startingPointLabel="Starting point: the earliest recorded preferred-PM poll"
      isDark={isDark}
    />
  );
}
