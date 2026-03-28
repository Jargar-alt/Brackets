import React from 'react';
import { Match, Team, TournamentRules, SetScore } from '../types';
import { MatchCard } from './MatchCard';
import { NetQueue } from './NetQueue';

interface BracketViewProps {
  matches: Match[];
  teams: Team[];
  onUpdateScore: (matchId: string, sets: SetScore[]) => void;
  isFinished?: boolean;
  rules: TournamentRules;
}

export const BracketView: React.FC<BracketViewProps> = ({ matches, teams, onUpdateScore, isFinished, rules }) => {
  const winnersMatches = matches.filter(m => m.bracketType !== 'losers');
  const losersMatches = matches.filter(m => m.bracketType === 'losers');

  const renderBracket = (bracketMatches: Match[], title: string) => {
    const bracketRounds = Array.from(new Set(bracketMatches.map(m => m.round))).sort((a: number, b: number) => a - b);
    
    return (
      <div className="mt-6">
        <div className="w95-list-header mb-3">{title}</div>
        <div className="bracket-h-scroll">
          {bracketRounds.map(round => (
            <div key={round} className="flex flex-col gap-6 min-w-[min(100%,280px)] snap-start">
              <div className="text-[10px] font-bold uppercase py-1 px-2 w95-inset sticky left-0 text-black">
                Round {round}
              </div>
              <div className="flex flex-col justify-around flex-1 gap-4">
                {bracketMatches
                  .filter(m => m.round === round)
                  .map(match => (
                    <div key={match.id} className="relative flex items-center pr-10">
                      <MatchCard
                        match={match}
                        teams={teams}
                        onUpdateScore={onUpdateScore}
                        disabled={isFinished}
                        rules={rules}
                      />
                      {match.nextMatchId && (
                        <div className="absolute right-0 w-10 h-px bg-zinc-400" />
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

  return (
    <div className="space-y-8">
      {!isFinished && <NetQueue matches={matches} teams={teams} />}

      {renderBracket(winnersMatches, winnersMatches.length === matches.length ? "Tournament Bracket" : "Winners Bracket")}
      {losersMatches.length > 0 && renderBracket(losersMatches, "Losers Bracket")}
    </div>
  );
};
