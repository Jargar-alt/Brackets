import type { Match, Team } from '../types';

/** Compact fingerprint for detecting meaningful match changes (avoids JSON.stringify). */
export function matchSyncFingerprint(m: Match): string {
  const sets = m.sets?.map(s => `${s.team1}-${s.team2}`).join(',') ?? '';
  return [
    m.team1Id ?? '',
    m.team2Id ?? '',
    m.winnerId ?? '',
    m.netIndex ?? '',
    m.score1 ?? '',
    m.score2 ?? '',
    m.byeWalkover ? 1 : 0,
    m.nextMatchId ?? '',
    m.loserMatchId ?? '',
    sets
  ].join('|');
}

export function matchesSyncEqual(a: Match[], b: Match[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const bMap = new Map(b.map(m => [m.id, matchSyncFingerprint(m)]));
  for (const m of a) {
    if (bMap.get(m.id) !== matchSyncFingerprint(m)) return false;
  }
  return true;
}

export function teamsSyncEqual(a: Team[], b: Team[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const bMap = new Map(
    b.map(t => [t.id, `${t.name}|${t.consecutiveWins ?? 0}|${t.group ?? ''}`])
  );
  for (const t of a) {
    const fp = `${t.name}|${t.consecutiveWins ?? 0}|${t.group ?? ''}`;
    if (bMap.get(t.id) !== fp) return false;
  }
  return true;
}

/** Matches whose sync-relevant fields differ from the baseline (by id). */
export function getChangedMatches(next: Match[], baseline: Match[]): Match[] {
  const baseMap = new Map(baseline.map(m => [m.id, matchSyncFingerprint(m)]));
  return next.filter(m => baseMap.get(m.id) !== matchSyncFingerprint(m));
}

export function buildTeamsById(teams: Team[]): Map<string, Team> {
  return new Map(teams.map(t => [t.id, t]));
}
