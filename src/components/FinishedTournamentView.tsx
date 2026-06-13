import { memo, useMemo } from 'react';
import { Home, Plus, GitMerge } from 'lucide-react';
import type { Match, Team, TournamentFormat } from '../types';
import { RecentResults } from './RecentResults';
import { CollapsibleSection } from './CollapsibleSection';
import { BracketReferenceStrip } from './EliminationCourtView';
import { isAutoAdvancePlaceholder } from '../lib/matchSchedule';
import { matchCountsTowardEliminationRecord } from '../lib/tournament/records';

interface Props {
  format: TournamentFormat;
  matches: Match[];
  teams: Team[];
  championId?: string | null;
  onGoHome: () => void;
  onNewTournament: () => void;
}

export const FinishedTournamentView = memo(function FinishedTournamentView({
  format,
  matches,
  teams,
  championId,
  onGoHome,
  onNewTournament
}: Props) {
  const completedMatches = useMemo(
    () =>
      matches
        .filter(m => m.winnerId && !isAutoAdvancePlaceholder(m))
        .sort((a, b) => (b.round ?? 0) - (a.round ?? 0) || b.id.localeCompare(a.id)),
    [matches]
  );

  const standings = useMemo(() => {
    if (format !== 'pool' && format !== 'casual') return null;
    const rows = teams.map(team => {
      const recordMs = matches.filter(
        m =>
          matchCountsTowardEliminationRecord(m) &&
          (m.team1Id === team.id || m.team2Id === team.id)
      );
      const wins = recordMs.filter(m => m.winnerId === team.id).length;
      const losses = recordMs.filter(m => m.winnerId && m.winnerId !== team.id).length;
      return { team, wins, losses };
    });
    return format === 'casual'
      ? [...rows].sort((a, b) => a.team.name.localeCompare(b.team.name))
      : [...rows].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }, [format, matches, teams]);

  const winnersMatches = useMemo(
    () => matches.filter(m => m.bracketType !== 'losers'),
    [matches]
  );
  const losersMatches = useMemo(
    () => matches.filter(m => m.bracketType === 'losers'),
    [matches]
  );
  const showBracket = format === 'single' || format === 'double';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onGoHome}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/14 bg-surface px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-surface-overlay"
        >
          <Home className="h-5 w-5" />
          Back to setup
        </button>
        <button
          type="button"
          onClick={onNewTournament}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-ink transition-opacity hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          New tournament
        </button>
      </div>

      {standings && standings.length > 0 && (
        <div className="w95-panel overflow-hidden p-0">
          <div className="border-b border-white/8 px-3 py-2.5 text-sm font-semibold text-ink sm:px-4">
            Final standings
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[240px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/8 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 sm:px-4">Team</th>
                  <th className="px-3 py-2 text-center">W</th>
                  <th className="px-3 py-2 text-center">L</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(({ team, wins, losses }) => (
                  <tr
                    key={team.id}
                    className={
                      championId === team.id ? 'bg-win/10' : 'border-b border-white/6 last:border-0'
                    }
                  >
                    <td className="px-3 py-2 font-medium text-ink sm:px-4">{team.name}</td>
                    <td className="px-3 py-2 text-center">{wins}</td>
                    <td className="px-3 py-2 text-center">{losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RecentResults
        matches={completedMatches}
        teams={teams}
        championId={championId}
        limit={12}
      />

      {showBracket && (
        <CollapsibleSection
          title="Bracket reference"
          icon={<GitMerge className="h-4 w-4 text-ink-muted" />}
          defaultOpen={false}
        >
          <BracketReferenceStrip
            matches={winnersMatches}
            teams={teams}
            label={format === 'double' ? 'Winners bracket' : 'Bracket'}
            championId={championId}
          />
          {losersMatches.length > 0 && (
            <div className="mt-6 border-t border-white/8 pt-4">
              <BracketReferenceStrip
                matches={losersMatches}
                teams={teams}
                label="Losers bracket"
                championId={championId}
              />
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
});
