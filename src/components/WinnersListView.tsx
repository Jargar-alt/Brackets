import React from 'react';
import { Match, Team, TournamentRules } from '../types';
import { MatchCard } from './MatchCard';
import { Users, Layout, ArrowRight, Trophy, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface WinnersListViewProps {
  matches: Match[];
  teams: Team[];
  queue: string[];
  numNets: number;
  onUpdateScore: (matchId: string, s1: number, s2: number) => void;
  onJoinQueue: (teamId: string) => void;
  onLeaveQueue: (teamId: string) => void;
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
  isCreator,
  isFinished,
  rules
}) => {
  const activeMatches = matches.filter(m => m.netIndex !== undefined && !m.winnerId);
  const completedMatches = matches.filter(m => m.winnerId).sort((a, b) => (b.round || 0) - (a.round || 0));

  const getTeam = (id: string | null) => teams.find(t => t.id === id);

  return (
    <div className="space-y-8">
      {/* Nets Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: numNets }).map((_, i) => {
          const match = activeMatches.find(m => m.netIndex === i);
          const nextUpId = queue[i];
          const nextUpTeam = nextUpId ? getTeam(nextUpId) : null;

          return (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
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
                  <MatchCard
                    match={match}
                    teams={teams}
                    onUpdateScore={onUpdateScore}
                    disabled={isFinished}
                  />
                ) : (
                  <div className="h-[100px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-xl text-zinc-300">
                    <Layout className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-xs font-medium">Empty Court</span>
                  </div>
                )}
              </div>
              
              {/* Next Up Footer */}
              <div className="px-4 py-2.5 bg-zinc-50/50 border-t border-zinc-100 flex items-center gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Queue Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-grey-blue" />
              Waiting List ({queue.length})
            </h3>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm divide-y divide-zinc-100">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <p className="text-xs">Queue is empty</p>
              </div>
            ) : (
              queue.map((teamId, index) => {
                const team = getTeam(teamId);
                return (
                  <div key={teamId} className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-zinc-700">{team?.name}</span>
                    </div>
                    {isCreator && !isFinished && (
                      <button
                        onClick={() => onLeaveQueue(teamId)}
                        className="text-xs font-bold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {!isFinished && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-zinc-400 uppercase px-1">Available Teams</p>
              <div className="flex flex-wrap gap-2">
                {teams.filter(t => !queue.includes(t.id) && !activeMatches.some(m => m.team1Id === t.id || m.team2Id === t.id)).map(team => (
                  <button
                    key={team.id}
                    onClick={() => onJoinQueue(team.id)}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    + {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Results Section */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-grey-blue" />
            Recent Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {completedMatches.slice(0, 6).map(match => (
              <div key={match.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between">
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
                  <Trophy className="w-4 h-4 text-grey-blue opacity-20" />
                </div>
              </div>
            ))}
            {completedMatches.length === 0 && (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-300">
                <span className="text-xs font-medium">No matches completed yet</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
