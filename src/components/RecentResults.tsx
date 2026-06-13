import type { Match, Team } from '../types';
import { Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatMatchScoreLine } from '../lib/matchDisplay';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  matches: Match[];
  teams: Team[];
  championId?: string | null;
  limit?: number;
}

export function RecentResults({ matches, teams, championId, limit = 10 }: Props) {
  const name = (id: string | null | undefined) =>
    id ? teams.find(t => t.id === id)?.name ?? '—' : '—';

  const visible = matches.slice(0, limit);

  if (matches.length === 0) {
    return (
      <CollapsibleSection title="Recent results" icon={<Trophy className="h-4 w-4 text-ink-muted" />} defaultOpen>
        <p className="py-6 text-center text-sm text-ink-muted">No finished matches yet.</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Recent results"
      icon={<Trophy className="h-4 w-4 text-ink-muted" />}
      badge={
        <span className="rounded-full border border-white/12 bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-secondary">
          {matches.length}
        </span>
      }
      defaultOpen={matches.length <= 4}
    >
      <ul className="divide-y divide-white/8">
        {visible.map(m => {
          const winnerId = m.winnerId;
          const loserId = winnerId === m.team1Id ? m.team2Id : m.team1Id;
          const score = formatMatchScoreLine(m);
          const isChamp = championId && winnerId === championId;
          return (
            <li key={m.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className={cn('font-semibold', isChamp ? 'text-win' : 'text-ink')}>
                    {name(winnerId)}
                  </span>
                  <span className="text-ink-muted"> def. </span>
                  <span className="text-ink-secondary">{name(loserId)}</span>
                </p>
                {score && (
                  <p className="mt-0.5 font-mono text-xs text-ink-muted">{score}</p>
                )}
                {(m.poolGroup || m.round > 1) && (
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    {m.poolGroup ? `Group ${m.poolGroup}` : ''}
                    {m.poolGroup && m.round > 0 ? ' · ' : ''}
                    {m.round > 0 ? `R${m.round}` : ''}
                  </p>
                )}
              </div>
              {isChamp && (
                <span className="shrink-0 rounded-full border border-win/30 bg-win/10 px-2 py-0.5 text-[10px] font-bold uppercase text-win">
                  Champ
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {matches.length > limit && (
        <p className="mt-3 text-center text-xs text-ink-muted">
          Showing latest {limit} of {matches.length}
        </p>
      )}
    </CollapsibleSection>
  );
}
