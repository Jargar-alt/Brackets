import React from 'react';
import { Match, Team } from '../types';
import { cn } from '../lib/utils';
import { LayoutGrid, Clock } from 'lucide-react';

interface NetQueueProps {
  matches: Match[];
  teams: Team[];
}

export const NetQueue: React.FC<NetQueueProps> = ({ matches, teams }) => {
  const activeMatches = matches.filter(m => m.netIndex !== undefined && !m.winnerId).sort((a, b) => (a.netIndex || 0) - (b.netIndex || 0));
  const queuedMatches = matches.filter(m => m.team1Id && m.team2Id && !m.winnerId && m.netIndex === undefined);

  if (activeMatches.length === 0 && queuedMatches.length === 0) return null;

  return (
    <div className="space-y-6 mb-12">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" /> Net Assignments
        </h3>
        {queuedMatches.length > 0 && (
          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {queuedMatches.length} in queue
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeMatches.map(match => {
          const t1 = teams.find(t => t.id === match.team1Id);
          const t2 = teams.find(t => t.id === match.team2Id);
          return (
            <div key={match.id} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-grey-blue/30 transition-all">
              <div className="absolute top-0 right-0 bg-grey-blue text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                NET {match.netIndex! + 1}
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold truncate text-zinc-700">{t1?.name || 'TBD'}</span>
                  <span className="text-[10px] font-bold text-zinc-300 uppercase">VS</span>
                  <span className="text-sm font-bold truncate text-zinc-700 text-right">{t2?.name || 'TBD'}</span>
                </div>
              </div>
            </div>
          );
        })}
        
        {queuedMatches.map((match, i) => {
          const t1 = teams.find(t => t.id === match.team1Id);
          const t2 = teams.find(t => t.id === match.team2Id);
          return (
            <div key={match.id} className="bg-zinc-50/50 p-4 rounded-2xl border border-dashed border-zinc-200 opacity-60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Next in Queue</span>
                <span className="text-[10px] font-bold text-zinc-400">#{i + 1}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium truncate text-zinc-500">{t1?.name}</span>
                <span className="text-[10px] font-bold text-zinc-300">VS</span>
                <span className="text-xs font-medium truncate text-zinc-500 text-right">{t2?.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
