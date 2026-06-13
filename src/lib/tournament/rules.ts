import type { TournamentRules } from '../../types';

export const DEFAULT_RULES: TournamentRules = {
  pointsToWin: 25,
  bestOf: 3,
  thirdSetTo: 15,
  serveToWin: false,
  winByTwo: true,
  gamesPerTeam: 2,
  poolGroups: 1,
  winnerStays: true,
  maxConsecutiveWins: 3,
  onMaxWins: 'other-stays'
};

export function sanitizeRules(r: TournamentRules | undefined | null): TournamentRules {
  const raw = { ...(r || {}) } as Partial<TournamentRules> & { playEachTimes?: unknown };
  delete raw.playEachTimes;
  const merged: TournamentRules = { ...DEFAULT_RULES, ...raw };

  const p = merged.pointsToWin;
  if (p !== 15 && p !== 21 && p !== 25) {
    merged.pointsToWin = 25;
  }

  let bestOf = merged.bestOf ?? DEFAULT_RULES.bestOf ?? 1;
  if (bestOf !== 1 && bestOf !== 3) bestOf = 1;
  merged.bestOf = bestOf;

  if (merged.thirdSetTo !== 15) merged.thirdSetTo = 15;

  let gpt = merged.gamesPerTeam ?? DEFAULT_RULES.gamesPerTeam ?? 2;
  if (typeof gpt !== 'number' || !Number.isFinite(gpt)) gpt = 2;
  gpt = Math.floor(gpt);
  if (gpt < 1) gpt = 1;
  if (gpt > 30) gpt = 30;
  merged.gamesPerTeam = gpt;

  let pg = merged.poolGroups ?? 1;
  if (typeof pg !== 'number' || !Number.isFinite(pg)) pg = 1;
  pg = Math.floor(pg);
  if (pg < 1) pg = 1;
  if (pg > 12) pg = 12;
  merged.poolGroups = pg;

  let maxW = merged.maxConsecutiveWins ?? DEFAULT_RULES.maxConsecutiveWins ?? 3;
  if (typeof maxW !== 'number' || !Number.isFinite(maxW)) maxW = 3;
  maxW = Math.floor(maxW);
  if (maxW < 1) maxW = 1;
  if (maxW > 20) maxW = 20;
  merged.maxConsecutiveWins = maxW;

  if (merged.onMaxWins !== 'both-off' && merged.onMaxWins !== 'other-stays') {
    merged.onMaxWins = 'other-stays';
  }

  return merged;
}
