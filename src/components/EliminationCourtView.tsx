import React, { useMemo } from 'react';
import { Match, SetScore, Team, TournamentRules } from '../types';
import { cn } from '../lib/utils';
import { GitMerge } from 'lucide-react';
import { CourtScheduleView } from './CourtScheduleView';
import { CollapsibleSection } from './CollapsibleSection';
import { isAutoAdvancePlaceholder } from '../lib/matchSchedule';
import { formatMatchScoreLine, roundLabel } from '../lib/matchDisplay';

interface EliminationCourtViewProps {
  matches: Match[];
  teams: Team[];
  numNets: number;
  onUpdateScore: (matchId: string, sets: SetScore[]) => void;
  isFinished?: boolean;
  rules: TournamentRules;
  highlightTeamId?: string | null;
  title?: string;
  variant: 'single' | 'double';
}

function BracketReferenceStrip({
  matches,
  teams,
  label,
  championId
}: {
  matches: Match[];
  teams: Team[];
  label: string;
  championId?: string | null;
}) {
  const rounds = useMemo(() => {
    const visible = matches.filter(m => !isAutoAdvancePlaceholder(m));
    const maxRound = Math.max(...visible.map(m => m.round), 0);
    const rs = Array.from(new Set(visible.map(m => m.round))).sort((a, b) => a - b);
    return rs.map(r => ({
      round: r,
      isFinal: r === maxRound,
      list: visible.filter(m => m.round === r)
    }));
  }, [matches]);

  const name = (id: string | null | undefined) =>
    id ? teams.find(t => t.id === id)?.name ?? 'TBD' : 'TBD';

  if (rounds.every(r => r.list.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">{label}</p>
      <div className="bracket-h-scroll gap-4 pb-1">
        {rounds.map(({ round, isFinal, list }) => (
          <div
            key={round}
            className="flex min-w-[min(78vw,12rem)] snap-start flex-col gap-2 sm:min-w-[10rem]"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {roundLabel(round, isFinal)}
            </p>
            <div className="flex flex-col gap-2">
              {list.map(m => {
                const w = m.winnerId;
                const t1w = w === m.team1Id;
                const t2w = w === m.team2Id;
                const score = formatMatchScoreLine(m);
                const isChamp = championId && w === championId;
                const pending = !w && m.team1Id && m.team2Id;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'rounded-xl border px-3 py-2.5',
                      isChamp
                        ? 'border-win/40 bg-win/15 ring-1 ring-win/30'
                        : w
                          ? 'border-white/12 bg-surface'
                          : pending
                            ? 'border-accent/25 bg-accent/5'
                            : 'border-white/8 bg-surface/80'
                    )}
                  >
                    <div className="space-y-1">
                      <p
                        className={cn(
                          'truncate text-sm',
                          t1w ? 'font-semibold text-win' : m.team1Id ? 'text-ink' : 'italic text-ink-muted'
                        )}
                      >
                        {name(m.team1Id)}
                      </p>
                      <p
                        className={cn(
                          'truncate text-sm',
                          t2w ? 'font-semibold text-win' : m.team2Id ? 'text-ink-secondary' : 'italic text-ink-muted'
                        )}
                      >
                        {name(m.team2Id)}
                      </p>
                    </div>
                    {score && <p className="mt-1.5 font-mono text-[11px] text-ink-muted">{score}</p>}
                    {pending && (
                      <p className="mt-1.5 text-[10px] font-semibold uppercase text-accent">Up next</p>
                    )}
                    {isChamp && (
                      <p className="mt-1.5 text-[10px] font-bold uppercase text-win">Champion</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const EliminationCourtView: React.FC<EliminationCourtViewProps> = ({
  matches,
  teams,
  numNets,
  onUpdateScore,
  isFinished,
  rules,
  highlightTeamId,
  title = 'Bracket',
  variant
}) => {
  const queueHelpText =
    variant === 'double'
      ? 'Double elim: round 1 winners bracket fills nets first. Later WB rounds wait until all WB round 1 scores are in.'
      : 'Matches take nets when both teams are known. Enter scores on the active courts below.';
  const winnersMatches = matches.filter(m => m.bracketType !== 'losers');
  const losersMatches = matches.filter(m => m.bracketType === 'losers');

  return (
    <div className="space-y-6 sm:space-y-8">
      <CourtScheduleView
        matches={matches}
        teams={teams}
        numNets={numNets}
        onUpdateScore={onUpdateScore}
        isFinished={isFinished}
        rules={rules}
        highlightTeamId={highlightTeamId}
        queueHelpText={queueHelpText}
        championId={highlightTeamId}
      />

      <CollapsibleSection
        title={title}
        icon={<GitMerge className="h-4 w-4 text-ink-muted" />}
        defaultOpen={Boolean(isFinished)}
      >
        <p className="mb-4 text-xs text-ink-secondary">
          Read-only bracket view — scores are entered on the courts above.
        </p>
        <BracketReferenceStrip
          matches={winnersMatches}
          teams={teams}
          label={variant === 'double' ? 'Winners bracket' : 'Bracket'}
          championId={highlightTeamId}
        />
        {losersMatches.length > 0 && (
          <div className="mt-6 border-t border-white/8 pt-4">
            <BracketReferenceStrip
              matches={losersMatches}
              teams={teams}
              label="Losers bracket"
              championId={highlightTeamId}
            />
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};

// Re-export for LiveResultsView
export { BracketReferenceStrip };
