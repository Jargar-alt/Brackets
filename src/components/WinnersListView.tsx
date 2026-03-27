import React from 'react';
import { Match, Team, TournamentRules } from '../types';
import { MatchCard } from './MatchCard';
import { Users, Layout, ArrowRight, Trophy, Clock, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface WinnersListViewProps {
  matches: Match[];
  teams: Team[];
  queue: string[];
  numNets: number;
  onUpdateScore: (matchId: string, s1: number, s2: number) => void;
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
  console.log('WinnersListView render:', { queue, teamsCount: teams.length, matchesCount: matches.length });
  const activeMatches = matches.filter(m => m.netIndex !== undefined && !m.winnerId);
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
      <div className="bg-white p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-zinc-200 shadow-xl shadow-zinc-200/50 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 flex items-center gap-3 sm:gap-4 tracking-tight">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-grey-blue" />
              Waiting List
              <span className="bg-grey-blue text-white px-3 sm:px-4 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-lg shadow-grey-blue/20">
                {queue.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm font-medium text-zinc-400">Teams waiting to rotate into an active court</p>
          </div>
          
          {!isFinished && (
            <form onSubmit={handleAddTeam} className="flex gap-2 sm:gap-3 w-full sm:w-auto p-1.5 sm:p-2 bg-zinc-50 rounded-xl sm:rounded-2xl border border-zinc-100 shadow-inner">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team Name..."
                className="flex-1 sm:w-72 bg-transparent border-none px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-bold focus:ring-0 outline-none placeholder:text-zinc-300"
              />
              <button
                type="submit"
                disabled={!newTeamName.trim()}
                className="bg-grey-blue text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black hover:bg-grey-blue/90 transition-all disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-grey-blue/20"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                  className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between group hover:border-grey-blue/30 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 text-sm font-bold text-zinc-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-800 truncate">{team?.name}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Waiting</div>
                    </div>
                  </div>
                  {isCreator && !isFinished && (
                    <button
                      onClick={() => onLeaveQueue(teamId)}
                      className="p-2 text-zinc-300 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {queue.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl text-zinc-300">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-50">Queue is empty</p>
              <p className="text-xs mt-1">Add teams below to start the rotation</p>
            </div>
          )}
        </div>

        {!isFinished && (
          <div className="bg-zinc-50/50 p-6 rounded-3xl border border-zinc-100">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-zinc-400" />
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Available to Join</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {teams.filter(t => !queue.includes(t.id) && !activeMatches.some(m => m.team1Id === t.id || m.team2Id === t.id)).map(team => (
                <button
                  key={team.id}
                  onClick={() => onJoinQueue(team.id)}
                  className="px-4 py-2 bg-white hover:bg-grey-blue hover:text-white border border-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  {team.name}
                </button>
              ))}
              {teams.filter(t => !queue.includes(t.id) && !activeMatches.some(m => m.team1Id === t.id || m.team2Id === t.id)).length === 0 && (
                <span className="text-xs text-zinc-400 italic">All teams are currently playing or in queue</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-zinc-100" />

      {/* Nets Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
          <Layout className="w-6 h-6 text-grey-blue" />
          Active Courts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: numNets }).map((_, i) => {
            const match = activeMatches.find(m => m.netIndex === i);
            const nextUpId = queue[i];
            const nextUpTeam = nextUpId ? getTeam(nextUpId) : null;

            return (
              <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col hover:border-grey-blue/20 transition-all">
                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Net {i + 1}</span>
                  {match ? (
                    <div className="flex items-center gap-2">
                      {rules.winnerStays && rules.maxConsecutiveWins && (
                        <div className="flex gap-1">
                          {Array.from({ length: rules.maxConsecutiveWins }).map((_, idx) => {
                            const team1 = getTeam(match.team1Id);
                            const team2 = getTeam(match.team2Id);
                            const t1Wins = team1?.consecutiveWins || 0;
                            const t2Wins = team2?.consecutiveWins || 0;
                            return (
                              <div 
                                key={idx} 
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full transition-colors",
                                  idx < Math.max(t1Wins, t2Wins) ? "bg-grey-blue" : "bg-zinc-200"
                                )} 
                              />
                            );
                          })}
                        </div>
                      )}
                      <span className="flex items-center gap-1 text-[10px] font-bold text-grey-blue uppercase">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Waiting for Teams</span>
                  )}
                </div>
                <div className="p-4 flex-1">
                  {match ? (
                    <div className="space-y-4">
                      <MatchCard
                        match={match}
                        teams={teams}
                        onUpdateScore={onUpdateScore}
                        disabled={isFinished}
                        rules={rules}
                      />
                      {!match.team2Id && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
                            Waiting for Opponent
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-[100px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-xl text-zinc-300">
                      <Layout className="w-8 h-8 mb-2 opacity-20" />
                      <span className="text-xs font-medium">Empty Court</span>
                    </div>
                  )}
                </div>
                
                {/* Next Up Footer */}
                <div className="px-4 py-3 bg-zinc-50/50 border-t border-zinc-100 flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Next Up:</span>
                  <span className={cn(
                    "text-[11px] font-bold truncate",
                    nextUpTeam ? "text-grey-blue" : "text-zinc-300 italic"
                  )}>
                    {nextUpTeam?.name || "No one in queue"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Results Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-grey-blue" />
          Recent Results
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {completedMatches.slice(0, 8).map(match => (
            <div key={match.id} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between hover:bg-zinc-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-bold truncate", match.winnerId === match.team1Id ? "text-green-600" : "text-zinc-400")}>
                    {getTeam(match.team1Id)?.name}
                  </span>
                  <span className="text-[10px] text-zinc-300">vs</span>
                  <span className={cn("text-xs font-bold truncate", match.winnerId === match.team2Id ? "text-green-600" : "text-zinc-400")}>
                    {getTeam(match.team2Id)?.name}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase">
                  {match.score1} - {match.score2}
                </div>
              </div>
              <div className="ml-4">
                <Trophy className="w-4 h-4 text-grey-blue opacity-10" />
              </div>
            </div>
          ))}
          {completedMatches.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl text-zinc-300">
              <span className="text-xs font-medium">No matches completed yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
