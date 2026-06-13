import { memo, useMemo } from 'react';
import type { Match, Team } from '../types';
import { countLiveMatches, isFeedMatch, sortMatchesForLiveFeed } from '../lib/matchStatus';
import { LiveMatchCard } from './LiveMatchCard';

interface Props {
  matches: Match[];
  teams: Team[];
}

export const LiveFeed = memo(function LiveFeed({ matches, teams }: Props) {
  const feedMatches = useMemo(
    () => sortMatchesForLiveFeed(matches).filter(isFeedMatch),
    [matches]
  );
  const liveCount = useMemo(() => countLiveMatches(matches), [matches]);

  if (!matches.length) return null;

  return (
    <section className="mb-6 animate-fade-up sm:mb-8">
      <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            {liveCount > 0 && <span className="h-2 w-2 rounded-full bg-live animate-live-pulse" />}
            <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Live</h2>
          </div>
          <p className="text-sm text-ink-secondary">
            {liveCount > 0
              ? `${liveCount} on court now`
              : 'No active courts — queue and results below'}
          </p>
        </div>
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-secondary sm:text-xs">
          {feedMatches.length} shown
        </p>
      </div>
      <div className="scrollbar-hide -mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2 sm:-mx-1 sm:px-1">
        {feedMatches.map(match => (
          <div key={match.id} className="snap-start">
            <LiveMatchCard match={match} teams={teams} />
          </div>
        ))}
      </div>
    </section>
  );
});
