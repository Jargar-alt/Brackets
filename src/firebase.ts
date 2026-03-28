import { initializeApp, type FirebaseApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

function trimEnv(value: string | undefined): string {
  return (value ?? '').trim();
}

/** Firebase web config — all values must come from `.env` (see `.env.example`). */
function firebaseConfigFromEnv() {
  const e = import.meta.env;
  const dbId = trimEnv(e.VITE_FIREBASE_FIRESTORE_DATABASE_ID);
  return {
    apiKey: trimEnv(e.VITE_FIREBASE_API_KEY),
    authDomain: trimEnv(e.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: trimEnv(e.VITE_FIREBASE_PROJECT_ID),
    storageBucket: trimEnv(e.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: trimEnv(e.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: trimEnv(e.VITE_FIREBASE_APP_ID),
    measurementId: trimEnv(e.VITE_FIREBASE_MEASUREMENT_ID),
    firestoreDatabaseId: dbId || '(default)'
  };
}

function configLooksUsable(c: ReturnType<typeof firebaseConfigFromEnv>): boolean {
  if (import.meta.env.VITE_FIREBASE_DISABLED === 'true') return false;
  return Boolean(
    c.apiKey &&
      c.authDomain &&
      c.projectId &&
      c.storageBucket &&
      c.messagingSenderId &&
      c.appId &&
      c.apiKey.length > 10 &&
      !c.apiKey.includes('YOUR_') &&
      c.projectId.length > 2
  );
}

const cfg = firebaseConfigFromEnv();
const shouldInit = configLooksUsable(cfg);

let app: FirebaseApp | undefined;
export let auth: Auth | null = null;
export let db: Firestore | null = null;
/** Set when `measurementId` is present and the browser supports Analytics. */
export let analytics: Analytics | null = null;

/** False when env disables Firebase, required env vars are missing, or initialization throws. */
export let isFirebaseConfigured = false;

if (shouldInit) {
  try {
    app = initializeApp({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId,
      measurementId: cfg.measurementId || undefined
    });
    auth = getAuth(app);
    const rawDb = cfg.firestoreDatabaseId.trim();
    db =
      !rawDb || rawDb === '(default)' ? getFirestore(app) : getFirestore(app, rawDb);
    isFirebaseConfigured = true;

    if (typeof window !== 'undefined' && cfg.measurementId) {
      void import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
        isSupported()
          .then((ok) => {
            if (ok && app) {
              try {
                analytics = getAnalytics(app);
              } catch {
                /* ad blockers / restricted contexts */
              }
            }
          })
          .catch(() => {});
      });
    }
  } catch (e) {
    console.error('[Firebase] Initialization failed. Cloud features are off.', e);
    auth = null;
    db = null;
    isFirebaseConfigured = false;
  }
} else {
  console.info(
    '[Firebase] Not configured. Set VITE_FIREBASE_* in .env (see .env.example). Running in local-only mode.'
  );
}
