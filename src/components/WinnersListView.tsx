import React from 'react';
import { Match, Team, TournamentRules, SetScore } from '../types';
import { MatchCard } from './MatchCard';
import { RecentResults } from './RecentResults';
import { Users, Layout, ArrowRight, Clock, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { matchIsOnNet } from '../lib/matchSchedule';
import { motion, AnimatePresence } from 'motion/react';

interface WinnersListViewProps {
  matches: Match[];
  teams: Team[];
  queue: string[];
  numNets: number;
  onUpdateScore: (matchId: string, sets: SetScore[]) => void;
  onJoinQueue: (teamId: string) => void;
  onLeaveQueue: (teamId: string) => void;
  onAddTeam: (name: string) => void;
  isCreator: boolean;
  isFinished: boolean;
  rules: TournamentRules;
}

export const WinnersListView: React.FC<WinnersListViewProps> = ({
  matches,
  teams,
  queue,
  numNets,
  onUpdateScore,
  onJoinQueue,
  onLeaveQueue,
  onAddTeam,
  isCreator,
  isFinished,
  rules
}) => {
  const [newTeamName, setNewTeamName] = React.useState('');
  const activeMatches = matches.filter(m => matchIsOnNet(m) && !m.winnerId);
  const completedMatches = matches.filter(m => m.winnerId).sort((a, b) => (b.round || 0) - (a.round || 0));

  const getTeam = (id: string | null) => teams.find(t => t.id === id);

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeamName.trim()) {
      onAddTeam(newTeamName.trim());
      setNewTeamName('');
    }
  };

  return (
    <div className="space-y-10">
      {/* Main Feature: The Queue (Waiting List) */}
      <div className="w95-panel space-y-4 sm:space-y-6">
        <div className="w95-list-header -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Waiting List
            <span className="rounded border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
              {queue.length}
            </span>
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs font-bold text-ink-secondary">Teams waiting for a court</p>
          {!isFinished && (
            <form onSubmit={handleAddTeam} className="flex gap-2 w-full sm:w-auto w95-inset p-1">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name..."
                className="flex-1 sm:w-64 w95-input min-h-9 text-sm py-1"
              />
              <button
                type="submit"
                disabled={!newTeamName.trim()}
                className="w95-btn-default text-xs disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Join
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {queue.map((teamId, index) => {
              const team = getTeam(teamId);
              return (
                <motion.div
                  key={teamId}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  className="w95-panel py-3 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 w95-inset text-sm font-bold text-ink flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-ink truncate">{team?.name}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Waiting</div>
                    </div>
                  </div>
                  {isCreator && !isFinished && (
                    <button
                      type="button"
                      onClick={() => onLeaveQueue(teamId)}
                      className="p-2 w95-btn min-h-0 sm:opacity-90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {queue.length === 0 && (
            <div className="col-span-full py-10 text-center w95-inset rounded-lg border border-dashed border-white/15 text-ink-muted">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold uppercase">Queue empty</p>
              <p className="text-xs mt-1 font-bold text-ink-secondary">Add teams to start</p>
            </div>
          )}
        </div>

        {!isFinished && (
          <div className="w95-panel">
            <div className="w95-list-header -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Available to join
            </div>
            <div className="flex flex-wrap gap-2">
              {teams.filter(t => !queue.includes(t.id) && !activeMatches.some(m => m.team1Id === t.id || m.team2Id === t.id)).map(team => (
                <button
                  type="button"
                  key={team.id}
                  onClick={() => onJoinQueue(team.id)}
                  className="w95-btn text-xs flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {team.name}
                </button>
              ))}
              {teams.filter(t => !queue.includes(t.id) && !activeMatches.some(m => m.team1Id === t.id || m.team2Id === t.id)).length === 0 && (
                <span className="text-xs font-bold text-ink-secondary">All teams active</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-0 border-t border-white/10" />

      {/* Nets Section */}
      <div className="space-y-4">
        <div className="w95-list-header flex items-center gap-2">
          <Layout className="w-4 h-4" />
          Active Courts
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: numNets }).map((_, i) => {
            const match = activeMatches.find(m => m.netIndex === i);
            const nextUpId = queue[i];
            const nextUpTeam = nextUpId ? getTeam(nextUpId) : null;

            return (
              <div key={i} className="w95-panel p-0 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-white/10 bg-surface-raised px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink">Net {i + 1}</span>
                  {match ? (
                    <div className="flex items-center gap-2">
                      {rules.winnerStays !== false && (
                        <span className="text-[10px] font-bold uppercase text-ink-muted">
                          Streak {Math.max(getTeam(match.team1Id)?.consecutiveWins || 0, getTeam(match.team2Id)?.consecutiveWins || 0)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] font-bold text-live uppercase">
                        <Clock className="w-3 h-3" /> Live
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-ink-muted uppercase">Idle</span>
                  )}
                </div>
                <div className="p-3 flex-1 bg-surface">
                  {match ? (
                    <div className="space-y-4">
                      <MatchCard
                        match={match}
                        teams={teams}
                        onUpdateScore={onUpdateScore}
                        disabled={isFinished}
                        rules={rules}
                        showNetBadge={false}
                      />
                      {!match.team2Id && (
                        <div className="flex items-center gap-2 px-2 py-1.5 w95-inset border border-white/12 text-[10px] font-bold uppercase text-ink-secondary">
                          Waiting for opponent
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-[100px] flex flex-col items-center justify-center w95-inset rounded-lg border border-dashed border-white/15 text-ink-muted">
                      <Layout className="w-8 h-8 mb-2 opacity-40" />
                      <span className="text-xs font-bold">Empty</span>
                    </div>
                  )}
                </div>

                <div className="px-3 py-2 border-t border-white/10 flex items-center gap-2 bg-surface">
                  <ArrowRight className="w-3 h-3 shrink-0 text-ink-muted" />
                  <span className="text-[10px] font-bold uppercase tracking-tight text-ink-secondary">Next:</span>
                  <span
                    className={cn(
                      'text-[11px] font-bold truncate text-ink',
                      !nextUpTeam && 'italic text-ink-muted'
                    )}
                  >
                    {nextUpTeam?.name || "No one in queue"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RecentResults
        matches={completedMatches}
        teams={teams}
      />
    </div>
  );
};
