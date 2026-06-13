import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db, requireUid } from "../firebase";
import type { Tournament, TournamentType } from "../../types/tournament";

const tournamentsCollection = collection(db, "tournaments");

function sortTournaments(tournaments: Tournament[]): Tournament[] {
  return [...tournaments].sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
}

export async function createTournament(input: {
  name: string;
  description: string;
  type: TournamentType;
  participantsCount: number;
}): Promise<string> {
  const ownerUid = await requireUid();
  const ref = await addDoc(tournamentsCollection, {
    ...input,
    ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export function subscribeToTournaments(
  onData: (tournaments: Tournament[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    tournamentsCollection,
    (snap) => {
      onData(
        sortTournaments(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name ?? "Untitled",
              type: data.type ?? "single-elim",
              description: data.description ?? "",
              participantsCount: data.participantsCount ?? 0,
              ownerUid: data.ownerUid ?? "",
              createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
              updatedAt: data.updatedAt?.toMillis?.() ?? Date.now()
            } as Tournament;
          })
        )
      );
    },
    (error) => onError?.(error)
  );
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const snap = await getDoc(doc(db, "tournaments", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name ?? "Untitled",
    type: data.type ?? "single-elim",
    description: data.description ?? "",
    participantsCount: data.participantsCount ?? 0,
    ownerUid: data.ownerUid ?? "",
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    updatedAt: data.updatedAt?.toMillis?.() ?? Date.now()
  };
}

export async function touchTournament(id: string): Promise<void> {
  await updateDoc(doc(db, "tournaments", id), {
    updatedAt: serverTimestamp()
  });
}

export function canEditTournament(tournament: Tournament | null, uid: string): boolean {
  return Boolean(tournament && uid && tournament.ownerUid === uid);
}
