import type { Match } from '../types';

export function formatMatchScoreLine(match: Match): string {
  if (match.sets && match.sets.length > 0) {
    return match.sets.map(s => `${s.team1}-${s.team2}`).join(', ');
  }
  if (match.score1 != null && match.score2 != null) {
    return `${match.score1}-${match.score2}`;
  }
  return '';
}

export function roundLabel(round: number, isFinal: boolean): string {
  if (isFinal) return 'Final';
  if (round === 1) return 'Round 1';
  return `Round ${round}`;
}
