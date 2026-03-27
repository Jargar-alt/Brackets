import React from 'react';
import { Match, Team, TournamentRules } from '../types';
import { cn } from '../lib/utils';
import { Trophy, LayoutGrid, Clock } from 'lucide-react';
import { MatchCard } from './MatchCard';
import { NetQueue } from './NetQueue';

interface PoolPlayViewProps {
  matches: Match[];
  teams: Team[];
  onUpdateScore: (matchId: string, team1Score: number, team2Score: number) => void;
  isFinished?: boolean;
  rules: TournamentRules;
}

export const PoolPlayView: React.FC<PoolPlayViewProps> = ({ matches, teams, onUpdateScore, isFinished, rules }) => {
  const standings = teams.map(team => {
    const teamMatches = matches.filter(m => m.team1Id === team.id || m.team2Id === team.id);
    const wins = teamMatches.filter(m => m.winnerId === team.id).length;
    const losses = teamMatches.filter(m => m.winnerId && m.winnerId !== team.id).length;
    const pointsFor = teamMatches.reduce((acc, m) => acc + (m.team1Id === team.id ? (m.score1 || 0) : (m.score2 || 0)), 0);
    const pointsAgainst = teamMatches.reduce((acc, m) => acc + (m.team1Id === team.id ? (m.score2 || 0) : (m.score1 || 0)), 0);
    
    return {
      ...team,
      wins,
      losses,
      diff: pointsFor - pointsAgainst
    };
  }).sort((a, b) => b.wins - a.wins || b.diff - a.diff);

  const winner = standings[0];

  return (
    <div className="space-y-8">
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

      <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[400px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-4 text-xs font-bold text-zinc-500 uppercase">Team</th>
              <th className="px-4 py-4 text-xs font-bold text-zinc-500 uppercase text-center">W</th>
              <th className="px-4 py-4 text-xs font-bold text-zinc-500 uppercase text-center">L</th>
              <th className="px-4 py-4 text-xs font-bold text-zinc-500 uppercase text-center">Diff</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, i) => (
              <tr key={team.id} className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-4 font-bold text-sm">{team.name}</td>
                <td className="px-4 py-4 text-center text-sm">{team.wins}</td>
                <td className="px-4 py-4 text-center text-sm">{team.losses}</td>
                <td className="px-4 py-4 text-center font-mono text-sm font-bold">
                  <span className={team.diff > 0 ? 'text-green-600' : team.diff < 0 ? 'text-red-600' : 'text-zinc-400'}>
                    {team.diff > 0 ? `+${team.diff}` : team.diff}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map(match => (
          <div key={match.id} className="bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-50 flex justify-between items-center mb-2">
              <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Match {match.id.split('-')[1]}
              </span>
              {match.winnerId && (
                <span className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Completed
                </span>
              )}
            </div>
            <div className="p-2 flex-1">
              <MatchCard
                match={match}
                teams={teams}
                onUpdateScore={onUpdateScore}
                disabled={isFinished}
                rules={rules}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
