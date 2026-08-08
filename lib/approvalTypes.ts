export interface LeaderColumn {
  /** Full name, e.g. "Christopher Luxon" -- stable identity across polls. */
  key: string;
  /** Short display name as shown on the source page, e.g. "Luxon". */
  shortName: string;
}

export interface LeaderPoll {
  date: string;
  dateLabel: string;
  pollster: string;
  sourceUrl: string | null;
  sampleSize: number | null;
  /** Keyed by LeaderColumn.key. */
  results: Record<string, number>;
}

export interface LeaderTable {
  leaders: LeaderColumn[];
  polls: LeaderPoll[];
  skipped: number;
}

export interface ApprovalData {
  fetchedAt: string;
  source: string;
  preferredPm: LeaderTable;
  leadershipApproval: LeaderTable;
}
