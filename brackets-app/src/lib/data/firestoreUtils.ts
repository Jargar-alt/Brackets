import type { Match } from "../../types/tournament";

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.round - b.round || a.order - b.order || a.id.localeCompare(b.id));
}

export function matchToFirestore(match: Match): Record<string, unknown> {
  return {
    round: match.round,
    order: match.order,
    bracket: match.bracket,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    winnerId: match.winnerId,
    nextMatchId: match.nextMatchId,
    nextSlot: match.nextSlot,
    loserNextMatchId: match.loserNextMatchId,
    loserNextSlot: match.loserNextSlot
  };
}

export const FIRESTORE_BATCH_LIMIT = 450;
