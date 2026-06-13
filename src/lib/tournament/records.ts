import type { Match } from '../../types';

/**
 * Elimination (and pool): count toward team W–L / games played only when both sides played
 * and the result was not a seeded round-1 walkover (`byeWalkover`).
 */
export function matchCountsTowardEliminationRecord(m: Match): boolean {
  if (m.byeWalkover) return false;
  return Boolean(m.team1Id && m.team2Id && m.winnerId);
}

/** Rally-point margin for one team in a single match (sum of per-set point diffs). */
export function matchPowerMarginForTeam(match: Match, teamId: string): number {
  if (match.team1Id !== teamId && match.team2Id !== teamId) return 0;

  if (match.sets?.length) {
    return match.sets.reduce((acc, set) => {
      if (match.team1Id === teamId) return acc + (set.team1 - set.team2);
      return acc + (set.team2 - set.team1);
    }, 0);
  }

  // Legacy rows without per-set scores: score1/score2 are sets won, not rally points.
  return 0;
}

/** Cumulative power rating — total rally-point margin across counted matches. */
export function teamPowerStat(teamId: string, matches: Match[]): number {
  return matches.reduce(
    (acc, m) =>
      matchCountsTowardEliminationRecord(m) ? acc + matchPowerMarginForTeam(m, teamId) : acc,
    0
  );
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
