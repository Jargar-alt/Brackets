import type { Match } from '../../types';

/**
 * Elimination (and pool): count toward team W–L / games played only when both sides played
 * and the result was not a seeded round-1 walkover (`byeWalkover`).
 */
export function matchCountsTowardEliminationRecord(m: Match): boolean {
  if (m.byeWalkover) return false;
  return Boolean(m.team1Id && m.team2Id && m.winnerId);
}

/** Losses in completed bracket matches (WB, LB, and grand finals). */
export function countBracketLosses(teamId: string, matches: Match[]): number {
  return matches.filter(
    m =>
      matchCountsTowardEliminationRecord(m) &&
      (m.team1Id === teamId || m.team2Id === teamId) &&
      m.winnerId !== teamId
  ).length;
}
