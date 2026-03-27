import React from 'react';
import { Match, Team, TournamentRules } from '../types';
import { MatchCard } from './MatchCard';
import { Trophy, LayoutGrid, Clock } from 'lucide-react';
import { NetQueue } from './NetQueue';

interface BracketViewProps {
  matches: Match[];
  teams: Team[];
  onUpdateScore: (matchId: string, team1Score: number, team2Score: number) => void;
  isFinished?: boolean;
  rules: TournamentRules;
}

export const BracketView: React.FC<BracketViewProps> = ({ matches, teams, onUpdateScore, isFinished, rules }) => {
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a: number, b: number) => a - b);
  
  const winnersMatches = matches.filter(m => m.bracketType !== 'losers');
  const losersMatches = matches.filter(m => m.bracketType === 'losers');

  const renderBracket = (bracketMatches: Match[], title: string) => {
    const bracketRounds = Array.from(new Set(bracketMatches.map(m => m.round))).sort((a: number, b: number) => a - b);
    
    return (
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-6 text-zinc-700 uppercase tracking-wider">{title}</h3>
        <div className="flex gap-8 overflow-x-auto pb-8 -mx-4 px-4 snap-x">
          {bracketRounds.map(round => (
            <div key={round} className="flex flex-col gap-8 min-w-[280px] snap-start">
              <div className="text-xs font-bold text-zinc-400 uppercase mb-2 sticky left-0 bg-zinc-50/80 backdrop-blur-sm py-1 px-2 rounded w-fit">
                Round {round}
              </div>
              <div className="flex flex-col justify-around flex-1 gap-6">
                {bracketMatches
                  .filter(m => m.round === round)
                  .map(match => (
                    <div key={match.id} className="relative flex items-center pr-12">
                      <MatchCard
                        match={match}
                        teams={teams}
                        onUpdateScore={onUpdateScore}
                        disabled={isFinished}
                        rules={rules}
                      />
                      {match.nextMatchId && (
                        <div className="absolute right-0 w-12 h-px bg-zinc-300" />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const finalMatch = matches.find(m => !m.nextMatchId && m.winnerId) || matches.sort((a,b) => b.round - a.round)[0];
  const winner = teams.find(t => t.id === finalMatch?.winnerId);

  return (
    <div className="space-y-12">
      {isFinished && winner && (
        <div className="bg-grey-green/10 border border-grey-green/30 p-6 rounded-2xl text-center animate-in fade-in zoom-in duration-500">
          <div className="inline-flex p-3 bg-grey-blue rounded-full mb-4 shadow-lg shadow-grey-blue/20">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Congratulations {winner.name}!</h2>
          <p className="text-zinc-500">Tournament Champions</p>
        </div>
      )}
      
      {!isFinished && <NetQueue matches={matches} teams={teams} />}

      {renderBracket(winnersMatches, winnersMatches.length === matches.length ? "Tournament Bracket" : "Winners Bracket")}
      {losersMatches.length > 0 && renderBracket(losersMatches, "Losers Bracket")}
    </div>
  );
};
