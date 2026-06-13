/** Safe JSON read from localStorage — corrupt data won't crash the app. */
export function readLocalStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

/** Firestore map keys are strings; normalize to numeric net indices. */
export function normalizeActiveNets(
  raw: Record<string, string | null> | Record<number, string | null> | undefined | null
): Record<number, string | null> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<number, string | null> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(k);
    if (Number.isFinite(n)) out[n] = v ?? null;
  }
  return out;
}

/** Immediately clear saved bracket progress (avoids debounced persistence restoring stale data). */
export function clearPersistedTournamentProgress(): void {
  try {
    localStorage.removeItem('tournament_id');
    localStorage.setItem('tournament_matches', '[]');
    localStorage.setItem('tournament_queue', '[]');
    localStorage.setItem('tournament_activeNets', '{}');
    localStorage.setItem('tournament_isStarted', 'false');
    localStorage.setItem('tournament_isFinished', 'false');
  } catch {
    /* ignore quota / private mode */
  }
}

/** Keep bracket data but mark the session as paused on the setup screen. */
export function markTournamentPausedLocally(): void {
  try {
    localStorage.setItem('tournament_isStarted', 'false');
  } catch {
    /* ignore */
  }
}
