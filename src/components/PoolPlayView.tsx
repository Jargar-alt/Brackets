import React from 'react';
import { Match, Team } from '../types';
import { cn } from '../lib/utils';

interface PoolPlayViewProps {
  matches: Match[];
  teams: Team[];
  onUpdateScore: (matchId: string, team1Score: number, team2Score: number) => void;
}

export const PoolPlayView: React.FC<PoolPlayViewProps> = ({ matches, teams, onUpdateScore }) => {
  // ... (standings calculation remains same)
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

  return (
    <div className="space-y-8">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map(match => {
          const t1 = teams.find(t => t.id === match.team1Id);
          const t2 = teams.find(t => t.id === match.team2Id);
          return (
            <div key={match.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Match {match.id.split('-')[1]}</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-bold truncate flex-1 pr-3", match.winnerId === t1?.id ? 'text-green-600' : 'text-zinc-700')}>
                    {t1?.name}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={match.score1 ?? ''}
                    onChange={(e) => onUpdateScore(match.id, parseInt(e.target.value) || 0, match.score2 || 0)}
                    className="w-14 h-10 text-center border border-zinc-200 rounded-lg text-base font-bold bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-grey-blue outline-none transition-all"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-bold truncate flex-1 pr-3", match.winnerId === t2?.id ? 'text-green-600' : 'text-zinc-700')}>
                    {t2?.name}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={match.score2 ?? ''}
                    onChange={(e) => onUpdateScore(match.id, match.score1 || 0, parseInt(e.target.value) || 0)}
                    className="w-14 h-10 text-center border border-zinc-200 rounded-lg text-base font-bold bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-grey-blue outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
