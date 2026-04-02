import type { Match } from '../../types';

const BYE_SENTINEL = '__bye__';

function placeTeamInPreferredSlot(target: Match, teamId: string, preferredSlot?: 1 | 2): Match {
  if (!teamId) return target;

  const writeSlot = (slot: 1 | 2): boolean => {
    if (slot === 1) {
      if (!target.team1Id || target.team1Id === teamId) {
        target.team1Id = teamId;
        return true;
      }
      return false;
    }
    if (!target.team2Id || target.team2Id === teamId) {
      target.team2Id = teamId;
      return true;
    }
    return false;
  };

  if (preferredSlot && writeSlot(preferredSlot)) return target;
  if (writeSlot(1)) return target;
  writeSlot(2);
  return target;
}

/** Match index i from ids like `w1-0`, `l3-2` (segment after last hyphen). */
export function parseBracketMatchIndex(matchId: string): number | null {
  if (
    matchId.startsWith('gf-') ||
    matchId.startsWith('p-') ||
    matchId.startsWith('c-') ||
    matchId.startsWith('pt-') ||
    matchId.startsWith('net-')
  ) {
    return null;
  }
  const parts = matchId.split('-');
  if (parts.length < 2) return null;
  const n = parseInt(parts[parts.length - 1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Places winner into the next match for WB/LB only (not grand finals — those are handled in propagateWinnerToNext).
 */
export function propagateWinner(matches: Match[], currentMatch: Match): void {
  const winnerId = currentMatch.winnerId;
  if (!winnerId || !currentMatch.nextMatchId) return;
  if (winnerId === BYE_SENTINEL) return;
  if (currentMatch.id === 'gf-1' || currentMatch.id === 'gf-2') return;

  const nextMatchIdx = matches.findIndex(m => m.id === currentMatch.nextMatchId);
  if (nextMatchIdx === -1) return;

  const nextMatch = { ...matches[nextMatchIdx] };
  if (currentMatch.nextMatchSlot) {
    matches[nextMatchIdx] = placeTeamInPreferredSlot(nextMatch, winnerId, currentMatch.nextMatchSlot);
    return;
  }
  const matchIdx = parseBracketMatchIndex(currentMatch.id);
  if (matchIdx === null) return;

  if (currentMatch.id.startsWith('w')) {
    const isTeam1 = matchIdx % 2 === 0;
    if (isTeam1) nextMatch.team1Id = winnerId;
    else nextMatch.team2Id = winnerId;
  } else if (currentMatch.id.startsWith('l')) {
    const round = currentMatch.round;
    if (round % 2 === 1) {
      nextMatch.team1Id = winnerId;
    } else {
      if (matchIdx % 2 === 0) nextMatch.team1Id = winnerId;
      else nextMatch.team2Id = winnerId;
    }
  }

  matches[nextMatchIdx] = nextMatch;
}

/**
 * Round-1 seed byes only: winners `w1-*` (ghost opponents) and casual `c-*` wave-1 walkovers.
 * Does not touch losers bracket or WR2+ — a lone team there is waiting on the sibling feeder, not a bye.
 */
function isRoundOneByeAutoAdvanceMatch(m: Match): boolean {
  if (m.round !== 1) return false;
  return m.id.startsWith('w') || m.id.startsWith('c-');
}

/**
 * Auto-advance **round 1** seed byes (one team, empty opponent). Winner is placed in the next match once; no further chain.
 * Casual `c-*` matches get a winner only (`propagateWinner` is a no-op for those ids).
 */
export function autoAdvanceByes(matches: Match[]): Match[] {
  let updated = [...matches];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < updated.length; i++) {
      const m = updated[i];
      if (m.winnerId) continue;
      if (!isRoundOneByeAutoAdvanceMatch(m)) continue;

      if (m.team1Id && !m.team2Id) {
        updated[i] = {
          ...m,
          winnerId: m.team1Id,
          byeWalkover: true,
          score1: undefined,
          score2: undefined,
          sets: undefined
        };
        changed = true;
        propagateWinner(updated, updated[i]);
      } else if (!m.team1Id && m.team2Id) {
        updated[i] = {
          ...m,
          winnerId: m.team2Id,
          byeWalkover: true,
          score1: undefined,
          score2: undefined,
          sets: undefined
        };
        changed = true;
        propagateWinner(updated, updated[i]);
      } else if (!m.team1Id && !m.team2Id) {
        updated[i] = { ...m, winnerId: BYE_SENTINEL, score1: 0, score2: 0 };
        changed = true;
      }
    }
  }
  return updated;
}

export { BYE_SENTINEL };

export function propagateWinnerToNext(
  updatedMatches: Match[],
  currentMatch: Match,
  matchId: string,
  winnerId: string
): { tournamentComplete: boolean } {
  if (matchId === 'gf-2' && winnerId) {
    return { tournamentComplete: true };
  }

  if (!winnerId) {
    return { tournamentComplete: false };
  }

  if (!currentMatch.nextMatchId) {
    return { tournamentComplete: false };
  }

  const nextMatchIdx = updatedMatches.findIndex(m => m.id === currentMatch.nextMatchId);
  if (nextMatchIdx === -1) {
    return { tournamentComplete: false };
  }

  const nextMatch = { ...updatedMatches[nextMatchIdx] };
  let tournamentComplete = false;

  if (matchId !== 'gf-1' && currentMatch.nextMatchSlot) {
    updatedMatches[nextMatchIdx] = placeTeamInPreferredSlot(nextMatch, winnerId, currentMatch.nextMatchSlot);
    return { tournamentComplete: false };
  }

  if (matchId.startsWith('w')) {
    const idx = parseBracketMatchIndex(matchId);
    if (idx === null) return { tournamentComplete: false };
    const isTeam1Slot = idx % 2 === 0;
    if (isTeam1Slot) nextMatch.team1Id = winnerId;
    else nextMatch.team2Id = winnerId;
  } else if (matchId.startsWith('l')) {
    const round = currentMatch.round;
    const matchIdx = parseBracketMatchIndex(matchId);
    if (matchIdx === null) return { tournamentComplete: false };
    if (round % 2 === 1) {
      nextMatch.team1Id = winnerId;
    } else {
      if (matchIdx % 2 === 0) nextMatch.team1Id = winnerId;
      else nextMatch.team2Id = winnerId;
    }
  } else if (matchId === 'gf-1') {
    if (winnerId === currentMatch.team2Id) {
      nextMatch.team1Id = currentMatch.team1Id;
      nextMatch.team2Id = currentMatch.team2Id;
    } else {
      tournamentComplete = true;
    }
  }

  updatedMatches[nextMatchIdx] = nextMatch;
  return { tournamentComplete };
}

export function propagateLoserToBracket(
  updatedMatches: Match[],
  currentMatch: Match,
  matchId: string,
  loserId: string
): void {
  if (!currentMatch.loserMatchId || !loserId) return;

  const loserMatchIdx = updatedMatches.findIndex(m => m.id === currentMatch.loserMatchId);
  if (loserMatchIdx === -1) return;

  const loserMatch = { ...updatedMatches[loserMatchIdx] };

  if (currentMatch.loserMatchSlot) {
    updatedMatches[loserMatchIdx] = placeTeamInPreferredSlot(
      loserMatch,
      loserId,
      currentMatch.loserMatchSlot
    );
    return;
  }

  if (currentMatch.round === 1) {
    const idx = parseBracketMatchIndex(matchId);
    if (idx === null) return;
    if (idx % 2 === 0) loserMatch.team1Id = loserId;
    else loserMatch.team2Id = loserId;
  } else {
    // LB feeder from prior L round uses team1 (odd-r propagateWinner); WB drop uses team2 first.
    if (!loserMatch.team2Id) {
      loserMatch.team2Id = loserId;
    } else if (!loserMatch.team1Id && loserMatch.team2Id !== loserId) {
      loserMatch.team1Id = loserId;
    }
  }

  updatedMatches[loserMatchIdx] = loserMatch;
}
