import type { Match } from '../../types';
import { matchIsOnNet } from '../matchSchedule';

/** Team ids currently on a live winners-list court (incomplete match on a net). */
export function winnersListActiveTeamIds(matches: Match[]): Set<string> {
  const ids = new Set<string>();
  for (const m of matches) {
    if (matchIsOnNet(m) && !m.winnerId) {
      if (m.team1Id) ids.add(m.team1Id);
      if (m.team2Id) ids.add(m.team2Id);
    }
  }
  return ids;
}

/** Drop queue entries for teams already assigned to an active court. */
export function sanitizeWinnersQueue(queue: string[], matches: Match[]): string[] {
  const active = winnersListActiveTeamIds(matches);
  return queue.filter(id => !active.has(id));
}

/**
 * Pull up to `count` teams from the queue, skipping anyone already on a net,
 * reserved/locked for assignment elsewhere, or already picked in this batch.
 */
export function pullTeamsFromWinnersQueue(
  queue: string[],
  matches: Match[],
  count: number,
  reservedIds: Iterable<string> = []
): { teamIds: string[]; remainingQueue: string[] } {
  if (count <= 0) {
    return { teamIds: [], remainingQueue: [...queue] };
  }

  const active = winnersListActiveTeamIds(matches);
  for (const id of reservedIds) active.add(id);
  const picked: string[] = [];
  const remainingQueue: string[] = [];

  for (const id of queue) {
    if (picked.length < count && !active.has(id) && !picked.includes(id)) {
      picked.push(id);
      active.add(id);
    } else {
      remainingQueue.push(id);
    }
  }

  return { teamIds: picked, remainingQueue };
}
