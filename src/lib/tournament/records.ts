import type { Match } from '../../types';

/**
 * Elimination (and pool): count toward team W–L / games played only when both sides played
 * and the result was not a seeded round-1 walkover (`byeWalkover`).
 */
export function matchCountsTowardEliminationRecord(m: Match): boolean {
  if (m.byeWalkover) return false;
  return Boolean(m.team1Id && m.team2Id && m.winnerId);
}
