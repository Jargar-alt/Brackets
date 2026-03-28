import type { Match } from '../../types';

/**
 * Assign net indices to matches that are ready to play (both teams, no winner).
 * A team may only appear on one active net at a time. Re-runs until no more
 * assignments are possible so we maximize concurrent nets without conflicts.
 */
export function assignNets(matches: Match[], numNets: number): Match[] {
  const updated = matches.map(m => ({ ...m }));

  const busyTeamIds = (): Set<string> => {
    const s = new Set<string>();
    for (const m of updated) {
      if (m.winnerId || m.netIndex === undefined) continue;
      if (m.team1Id) s.add(m.team1Id);
      if (m.team2Id) s.add(m.team2Id);
    }
    return s;
  };

  const occupiedNetIndices = (): Set<number> =>
    new Set(
      updated
        .filter(m => m.netIndex !== undefined && !m.winnerId)
        .map(m => m.netIndex as number)
    );

  let changed = true;
  while (changed) {
    changed = false;
    const busy = busyTeamIds();
    const occupied = occupiedNetIndices();

    for (let i = 0; i < updated.length; i++) {
      const m = updated[i];
      if (!m.team1Id || !m.team2Id || m.winnerId || m.netIndex !== undefined) continue;
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
