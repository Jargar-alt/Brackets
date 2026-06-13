import type { Match, Participant, TournamentType } from "../../types/tournament";

export function validateBracketSeed(
  matches: Match[],
  participants: Participant[],
  type: TournamentType
): void {
  if (participants.length < 2) {
    throw new Error("Add at least 2 participants before generating a bracket.");
  }

  if (!matches.length) {
    throw new Error("Bracket generation produced no matches.");
  }

  const participantIds = new Set(participants.map((p) => p.id));

  if (type === "round-robin") {
    const invalid = matches.find((m) => {
      if (!m.player1Id || !m.player2Id) return true;
      return !participantIds.has(m.player1Id) || !participantIds.has(m.player2Id);
    });
    if (invalid) {
      throw new Error("Round-robin matches are missing valid participants.");
    }
    return;
  }

  const roundOne = matches.filter((m) => m.bracket === "winners" || m.bracket === "main").filter((m) => m.round === 1);
  if (!roundOne.length) {
    throw new Error("Bracket is missing round 1 matches.");
  }

  const seededSlots = roundOne.flatMap((m) => [m.player1Id, m.player2Id]).filter(Boolean) as string[];
  if (!seededSlots.length) {
    throw new Error("No participants were assigned to round 1.");
  }

  const unknownIds = seededSlots.filter((id) => !participantIds.has(id));
  if (unknownIds.length) {
    throw new Error("Bracket references participants that no longer exist. Regenerate after adding players.");
  }
}
