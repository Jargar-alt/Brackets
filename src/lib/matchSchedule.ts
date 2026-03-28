import type { Match } from '../types';

/** True when the match is assigned to a court index (handles Firestore null vs missing). */
export function matchIsOnNet(m: Match): boolean {
  return typeof m.netIndex === 'number' && Number.isFinite(m.netIndex) && m.netIndex >= 0;
}

/** Ready to play but not on a net yet (both teams set, no winner, no court). */
export function matchIsWaitingForCourt(m: Match): boolean {
  return Boolean(m.team1Id && m.team2Id && !m.winnerId && !matchIsOnNet(m));
}
