export type TournamentFormat = 'single' | 'double' | 'pool' | 'casual' | 'winners-list';

export interface TournamentRules {
  pointsToWin: 15 | 21 | 25;
  bestOf: 1 | 3;
  thirdSetTo: 15;
  serveToWin: boolean;
  winByTwo: boolean;
  /**
   * Casual format only: number of waves (each team plays once per wave). Next wave unlocks when the
   * current one is finished; pairings favor similar records (winners vs winners when possible).
   */
  gamesPerTeam?: number;
  /**
   * Round robin (pool): number of World Cup–style groups (1 = one full pool). Teams are assigned
   * A, B, C… in order; each group plays its own round robin.
   */
  poolGroups?: number;
  winnerStays?: boolean;
  maxConsecutiveWins?: number;
  onMaxWins?: 'other-stays' | 'both-off';
}

export interface Team {
  id: string;
  name: string;
  players?: number;
  consecutiveWins?: number;
  /** Pool play: group letter when using multiple groups. */
  group?: string;
}

/** Per-set rally scores (team1 = match.team1Id side). */
export interface SetScore {
  team1: number;
  team2: number;
}

export interface Match {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  score1?: number;
  score2?: number;
  /** Completed sets in order; when present, winner follows best-of rules. */
  sets?: SetScore[];
  winnerId?: string | null;
  /** True when the winner advanced from a seeded R1 bye (no real match) — omit from team records. */
  byeWalkover?: boolean;
  nextMatchId?: string | null;
  /** Preferred slot in nextMatchId where winner should be placed. */
  nextMatchSlot?: 1 | 2;
  loserMatchId?: string | null;
  /** Preferred slot in loserMatchId where loser should be placed. */
  loserMatchSlot?: 1 | 2;
  round: number;
  bracketType?: 'winners' | 'losers';
  netIndex?: number;
  /** Pool: which group this match belongs to (e.g. A, B). */
  poolGroup?: string;
}

export interface TournamentState {
  id?: string;
  name: string;
  teams: Team[];
  format: TournamentFormat;
  matches: Match[];
  isStarted: boolean;
  isFinished?: boolean;
  inviteCode: string;
  creatorId: string;
  rules: TournamentRules;
  numNets?: number;
  queue?: string[]; // Team IDs in order
  activeNets?: { [netIndex: number]: string | null }; // Match ID or similar
}
