import React from 'react';
import { Match, Team, TournamentRules } from '../types';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatchCardProps {
  match: Match;
  teams: Team[];
  onUpdateScore: (matchId: string, team1Score: number, team2Score: number) => void;
  disabled?: boolean;
  rules?: TournamentRules;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, teams, onUpdateScore, disabled, rules }) => {
  const [score1, setScore1] = React.useState<number | string>(match.score1 ?? '');
  const [score2, setScore2] = React.useState<number | string>(match.score2 ?? '');

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);

  // Update local state when match prop changes (e.g. from cloud sync)
  React.useEffect(() => {
    setScore1(match.score1 ?? '');
    setScore2(match.score2 ?? '');
  }, [match.score1, match.score2]);

  const s1 = parseInt(score1.toString()) || 0;
  const s2 = parseInt(score2.toString()) || 0;
  const diff = Math.abs(s1 - s2);
  const isInvalidWinByTwo = rules?.winByTwo && diff < 2 && (score1 !== '' && score2 !== '');

  const handleSubmit = () => {
    if (isInvalidWinByTwo) return;
    onUpdateScore(match.id, s1, s2);
  };

  return (
    <div className="match-card w-full">
      {match.netIndex !== undefined && !match.winnerId && (
        <div className="flex justify-end mb-2">
          <div className="bg-grey-blue/10 text-grey-blue text-[10px] font-bold px-2 py-0.5 rounded-full border border-grey-blue/20">
            NET {match.netIndex + 1}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <div className={cn(
          "flex items-center justify-between p-3 rounded-xl transition-all border",
          match.winnerId === team1?.id && team1 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-zinc-50 border-zinc-100'
        )}>
          <span className="text-sm font-bold truncate flex-1 pr-2">
            {team1?.name || <span className="text-zinc-400 italic font-normal">TBD</span>}
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            disabled={disabled || !team1 || !team2}
            className={cn(
              "w-16 h-12 text-center border rounded-lg text-xl font-bold focus:ring-2 focus:ring-grey-blue outline-none disabled:bg-zinc-100 disabled:text-zinc-400 bg-white shadow-sm",
              isInvalidWinByTwo ? "border-red-300 ring-2 ring-red-100" : "border-zinc-200"
            )}
          />
        </div>
        <div className={cn(
          "flex items-center justify-between p-3 rounded-xl transition-all border",
          match.winnerId === team2?.id && team2 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-zinc-50 border-zinc-100'
        )}>
          <span className="text-sm font-bold truncate flex-1 pr-2">
            {team2?.name || <span className="text-zinc-400 italic font-normal">TBD</span>}
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            disabled={disabled || !team1 || !team2}
            className={cn(
              "w-16 h-12 text-center border rounded-lg text-xl font-bold focus:ring-2 focus:ring-grey-blue outline-none disabled:bg-zinc-100 disabled:text-zinc-400 bg-white shadow-sm",
              isInvalidWinByTwo ? "border-red-300 ring-2 ring-red-100" : "border-zinc-200"
            )}
          />
        </div>
        
        {isInvalidWinByTwo && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
            <AlertCircle className="w-3 h-3" />
            Must win by at least 2 points
          </div>
        )}

        {rules?.winByTwo && !isInvalidWinByTwo && !match.winnerId && team1 && team2 && (
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider text-center pt-1">
            Win by 2 required
          </div>
        )}

        {!match.winnerId && team1 && team2 && !disabled && (
          <button
            onClick={handleSubmit}
            disabled={score1 === '' || score2 === '' || score1 === score2 || isInvalidWinByTwo}
            className="w-full mt-2 bg-grey-blue text-white py-3.5 rounded-lg text-sm font-bold hover:bg-grey-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-grey-blue/10"
          >
            Submit Score
          </button>
        )}
      </div>
    </div>
  );
};
