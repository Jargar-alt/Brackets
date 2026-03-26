export type TournamentFormat = 'single' | 'double' | 'pool' | 'play-twice';

export interface TournamentRules {
  pointsToWin: 15 | 21 | 25 | 0; // 0 for traditional
  bestOf: 1 | 3;
  thirdSetTo: 15;
  serveToWin: boolean;
}

export interface Team {
  id: string;
  name: string;
  players?: number;
}

export interface Match {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  score1?: number;
  score2?: number;
  winnerId?: string | null;
  nextMatchId?: string | null;
  round: number;
  bracketType?: 'winners' | 'losers';
}

export interface TournamentState {
  id?: string;
  name: string;
  teams: Team[];
  format: TournamentFormat;
  matches: Match[];
  isStarted: boolean;
  inviteCode: string;
  creatorId: string;
  rules: TournamentRules;
}
