import type { Match, Team, TournamentFormat } from '../../types';
import { BYE_SENTINEL } from './advance';
import { isAutoAdvancePlaceholder } from '../matchSchedule';

function isRealWinner(id: string | null | undefined): id is string {
  return Boolean(id && id !== BYE_SENTINEL);
}

function singleElimFinal(matches: Match[]): Match | null {
  const winners = matches.filter(
    m => m.bracketType !== 'losers' && !isAutoAdvancePlaceholder(m) && m.team1Id && m.team2Id
  );
  if (!winners.length) return null;
  const maxRound = Math.max(...winners.map(m => m.round));
  const finals = winners.filter(m => m.round === maxRound);
  return finals.length === 1 ? finals[0]! : null;
}

/** Resolve tournament champion team id from bracket state. */
export function resolveChampionTeamId(matches: Match[]): string | null {
  const gf2 = matches.find(m => m.id === 'gf-2');
  if (isRealWinner(gf2?.winnerId)) return gf2!.winnerId!;

  const gf1 = matches.find(m => m.id === 'gf-1');
  if (gf1 && isRealWinner(gf1.winnerId)) {
    if (gf1.winnerId === gf1.team1Id) return gf1.winnerId;
    return null;
  }

  const final = singleElimFinal(matches);
  if (final && isRealWinner(final.winnerId)) return final.winnerId;

  return null;
}

/** True when the bracket has a decided champion (auto-finish eligible). */
export function isTournamentDecided(format: TournamentFormat, matches: Match[]): boolean {
  if (format === 'pool' || format === 'casual') {
    return matches.length > 0 && matches.every(m => m.winnerId);
  }
  if (format === 'single' || format === 'double') {
    return resolveChampionTeamId(matches) !== null;
  }
  return false;
}

/** Champion team for UI when tournament is finished (all formats). */
export function resolveDisplayChampion(
  format: TournamentFormat,
  matches: Match[],
  teams: Team[]
): Team | null {
  const byId = (id: string | null | undefined) =>
    id ? teams.find(t => t.id === id) ?? null : null;

  if (format === 'pool') {
    let best: Team | null = null;
    let wBest = -1;
    for (const t of teams) {
      const w = matches.filter(m => m.winnerId === t.id && !m.byeWalkover).length;
      if (w > wBest) {
        wBest = w;
        best = t;
      }
    }
    return wBest > 0 ? best : null;
  }

  if (format === 'casual') {
    return null;
  }

  if (format === 'winners-list') {
    const done = matches.filter(m => m.winnerId);
    if (done.length === 0) return null;
    const sorted = [...done].sort(
      (a, b) => b.round - a.round || b.id.localeCompare(a.id)
    );
    return byId(sorted[0]!.winnerId);
  }

  return byId(resolveChampionTeamId(matches));
}
