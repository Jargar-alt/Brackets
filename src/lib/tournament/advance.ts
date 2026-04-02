import type { Match } from '../../types';

const BYE_SENTINEL = '__bye__';

type FeederKind = 'winner' | 'loser';
type Slot = 1 | 2;
type Feeder = { sourceId: string; kind: FeederKind; slot: Slot };

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

function inferNextFeedSlot(m: Match): Slot | null {
  if (m.nextMatchSlot) return m.nextMatchSlot;
  const idx = parseBracketMatchIndex(m.id);
  if (idx === null) return null;
  if (m.id.startsWith('w')) return idx % 2 === 0 ? 1 : 2;
  if (m.id.startsWith('l')) {
    if (m.round % 2 === 1) return 1;
    return idx % 2 === 0 ? 1 : 2;
  }
  return null;
}

function inferLoserFeedSlot(m: Match): Slot | null {
  if (m.loserMatchSlot) return m.loserMatchSlot;
  const idx = parseBracketMatchIndex(m.id);
  if (idx === null) return null;
  if (m.round === 1) return idx % 2 === 0 ? 1 : 2;
  return 2;
}

function resolveFeederTeam(source: Match, kind: FeederKind): { resolved: boolean; teamId: string | null } {
  if (!source.winnerId) return { resolved: false, teamId: null };
  if (source.winnerId === BYE_SENTINEL) return { resolved: true, teamId: null };
  if (kind === 'winner') return { resolved: true, teamId: source.winnerId };

  const t1 = source.team1Id;
  const t2 = source.team2Id;
  if (source.winnerId === t1) return { resolved: true, teamId: t2 ?? null };
  if (source.winnerId === t2) return { resolved: true, teamId: t1 ?? null };
  return { resolved: true, teamId: null };
}

function slotIsClosed(
  matchesById: Map<string, Match>,
  feedersByTarget: Map<string, Feeder[]>,
  targetId: string,
  slot: Slot
): boolean {
  const feeders = (feedersByTarget.get(targetId) ?? []).filter(f => f.slot === slot);
  if (feeders.length === 0) return true;
  return feeders.every(f => {
    const src = matchesById.get(f.sourceId);
    if (!src) return true;
    return resolveFeederTeam(src, f.kind).resolved;
  });
}

function hydrateResolvedFeeds(matches: Match[], feedersByTarget: Map<string, Feeder[]>): boolean {
  let changed = false;
  const byId = new Map(matches.map(m => [m.id, m]));

  for (let i = 0; i < matches.length; i++) {
    const target = matches[i];
    const feeds = feedersByTarget.get(target.id);
    if (!feeds || feeds.length === 0) continue;
    const next = { ...target };

    const hydrateSlot = (slot: Slot) => {
      if (slot === 1 && next.team1Id) return;
      if (slot === 2 && next.team2Id) return;
      const candidates = feeds.filter(f => f.slot === slot);
      for (const feeder of candidates) {
        const src = byId.get(feeder.sourceId);
        if (!src) continue;
        const r = resolveFeederTeam(src, feeder.kind);
        if (r.resolved && r.teamId) {
          if (slot === 1) next.team1Id = r.teamId;
          else next.team2Id = r.teamId;
          break;
        }
      }
    };

    hydrateSlot(1);
    hydrateSlot(2);
    if (next.team1Id !== target.team1Id || next.team2Id !== target.team2Id) {
      matches[i] = next;
      changed = true;
    }
  }

  return changed;
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
 * Auto-resolve uncontested matches once all feeders for an empty slot are resolved.
 * This covers seeded byes and downstream bracket walkovers (including losers bracket).
 */
export function autoAdvanceByes(matches: Match[]): Match[] {
  let updated = [...matches];
  const feedersByTarget = new Map<string, Feeder[]>();
  for (const m of updated) {
    if (m.nextMatchId) {
      const slot = inferNextFeedSlot(m);
      if (slot) {
        const arr = feedersByTarget.get(m.nextMatchId) ?? [];
        arr.push({ sourceId: m.id, kind: 'winner', slot });
        feedersByTarget.set(m.nextMatchId, arr);
      }
    }
    if (m.loserMatchId) {
      const slot = inferLoserFeedSlot(m);
      if (slot) {
        const arr = feedersByTarget.get(m.loserMatchId) ?? [];
        arr.push({ sourceId: m.id, kind: 'loser', slot });
        feedersByTarget.set(m.loserMatchId, arr);
      }
    }
  }
  let changed = true;

  while (changed) {
    changed = false;
    if (hydrateResolvedFeeds(updated, feedersByTarget)) {
      changed = true;
    }
    const byId = new Map(updated.map(m => [m.id, m]));

    for (let i = 0; i < updated.length; i++) {
      const m = updated[i];
      if (m.winnerId) continue;
      const hasTeam1 = Boolean(m.team1Id);
      const hasTeam2 = Boolean(m.team2Id);

      if (hasTeam1 && !hasTeam2 && slotIsClosed(byId, feedersByTarget, m.id, 2)) {
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
      } else if (!hasTeam1 && hasTeam2 && slotIsClosed(byId, feedersByTarget, m.id, 1)) {
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
      } else if (
        !hasTeam1 &&
        !hasTeam2 &&
        slotIsClosed(byId, feedersByTarget, m.id, 1) &&
        slotIsClosed(byId, feedersByTarget, m.id, 2)
      ) {
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
