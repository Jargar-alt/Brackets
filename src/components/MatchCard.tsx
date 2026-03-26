import React from 'react';
import { Match, Team } from '../types';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatchCardProps {
  match: Match;
  teams: Team[];
  onUpdateScore: (matchId: string, team1Score: number, team2Score: number) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, teams, onUpdateScore }) => {
  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);

  const handleScoreChange = (team: 1 | 2, value: string) => {
    const score = parseInt(value) || 0;
    if (team === 1) {
      onUpdateScore(match.id, score, match.score2 || 0);
    } else {
      onUpdateScore(match.id, match.score1 || 0, score);
    }
  };

  return (
    <div className="match-card w-full max-w-[240px]">
      <div className="p-2 space-y-1">
        <div className={cn(
          "flex items-center justify-between p-2 rounded-md transition-colors",
          match.winnerId === team1?.id && team1 ? 'bg-green-50 text-green-700' : 'bg-zinc-50'
        )}>
          <span className="text-sm font-semibold truncate flex-1 pr-2">
            {team1?.name || <span className="text-zinc-400 italic font-normal">TBD</span>}
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={match.score1 ?? ''}
            onChange={(e) => handleScoreChange(1, e.target.value)}
            disabled={!team1 || !team2}
            className="w-12 h-9 text-center border border-zinc-200 rounded-md text-base font-bold focus:ring-2 focus:ring-grey-blue outline-none disabled:bg-zinc-100 disabled:text-zinc-400 bg-white"
          />
        </div>
        <div className={cn(
          "flex items-center justify-between p-2 rounded-md transition-colors",
          match.winnerId === team2?.id && team2 ? 'bg-green-50 text-green-700' : 'bg-zinc-50'
        )}>
          <span className="text-sm font-semibold truncate flex-1 pr-2">
            {team2?.name || <span className="text-zinc-400 italic font-normal">TBD</span>}
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={match.score2 ?? ''}
            onChange={(e) => handleScoreChange(2, e.target.value)}
            disabled={!team1 || !team2}
            className="w-12 h-9 text-center border border-zinc-200 rounded-md text-base font-bold focus:ring-2 focus:ring-grey-blue outline-none disabled:bg-zinc-100 disabled:text-zinc-400 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
