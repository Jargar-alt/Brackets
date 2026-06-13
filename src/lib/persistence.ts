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
