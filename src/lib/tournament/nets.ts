import type { Match, TournamentFormat } from '../../types';

function winnersBracketRound1Complete(matches: Match[]): boolean {
  const r1 = matches.filter(m => m.bracketType === 'winners' && m.round === 1);
  if (r1.length === 0) return true;
  return r1.every(m => m.winnerId);
}

/** Double elim: no winners-bracket match with round > 1 gets a net until all WB round 1 games are decided. */
function doubleElimNetEligible(matches: Match[], m: Match): boolean {
  if (m.bracketType !== 'winners') return true;
  if (m.round <= 1) return true;
  return winnersBracketRound1Complete(matches);
}

function assignNetsWithOrder(
  matches: Match[],
  numNets: number,
  orderIndices: readonly number[],
  format?: TournamentFormat
): Match[] {
  const updated = matches.map(x => ({ ...x }));
  const holdWb2 = format === 'double';

  let changed = true;
  while (changed) {
    changed = false;
    const busy = new Set<string>();
    for (const m of updated) {
      if (m.winnerId || m.netIndex === undefined) continue;
      if (m.team1Id) busy.add(m.team1Id);
      if (m.team2Id) busy.add(m.team2Id);
    }
    const occupied = new Set(
      updated
        .filter(m => m.netIndex !== undefined && !m.winnerId)
        .map(m => m.netIndex as number)
    );

    for (const i of orderIndices) {
      const m = updated[i];
      if (!m || !m.team1Id || !m.team2Id || m.winnerId || m.netIndex !== undefined) continue;
      if (holdWb2 && !doubleElimNetEligible(updated, m)) continue;
      if (busy.has(m.team1Id) || busy.has(m.team2Id)) continue;

      for (let n = 0; n < numNets; n++) {
        if (!occupied.has(n)) {
          updated[i] = { ...m, netIndex: n };
          busy.add(m.team1Id);
          busy.add(m.team2Id);
          occupied.add(n);
          changed = true;
          break;
        }
      }
    }
  }

  return updated;
}

/**
 * Assign net indices to matches that are ready to play (both teams, no winner).
 * A team may only appear on one active net at a time.
 * Double elimination: winners bracket round 2+ waits until every winners bracket round 1 match has a winner.
 */
export function assignNets(
  matches: Match[],
  numNets: number,
  format?: TournamentFormat
): Match[] {
  return assignNetsWithOrder(
    matches,
    numNets,
    matches.map((_, i) => i),
    format
  );
}

/** Round robin: group letter (FIFA-style), then round, then id. */
export function assignRoundRobinNets(matches: Match[], numNets: number): Match[] {
  const order = matches
    .map((_, i) => i)
    .sort((ia, ib) => {
      const ma = matches[ia]!;
      const mb = matches[ib]!;
      const ga = ma.poolGroup ?? '';
      const gb = mb.poolGroup ?? '';
      if (ga !== gb) return ga.localeCompare(gb);
      const ra = ma.round ?? 0;
      const rb = mb.round ?? 0;
      if (ra !== rb) return ra - rb;
      return ma.id.localeCompare(mb.id);
    });
  return assignNetsWithOrder(matches, numNets, order, undefined);
}
