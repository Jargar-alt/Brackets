import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import appletJson from '../firebase-applet-config.json';

type AppletConfig = typeof appletJson;

function mergedConfig(): AppletConfig & { firestoreDatabaseId: string } {
  const env = import.meta.env;
  return {
    projectId: (env.VITE_FIREBASE_PROJECT_ID as string) || appletJson.projectId,
    appId: (env.VITE_FIREBASE_APP_ID as string) || appletJson.appId,
    apiKey: (env.VITE_FIREBASE_API_KEY as string) || appletJson.apiKey,
    authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || appletJson.authDomain,
    firestoreDatabaseId:
      (env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || appletJson.firestoreDatabaseId,
    storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string) || appletJson.storageBucket,
    messagingSenderId:
      (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || appletJson.messagingSenderId,
    measurementId: appletJson.measurementId || ''
  };
}

function configLooksUsable(c: ReturnType<typeof mergedConfig>): boolean {
  if (import.meta.env.VITE_FIREBASE_DISABLED === 'true') return false;
  return Boolean(
    c.apiKey &&
      c.projectId &&
      c.apiKey.length > 10 &&
      !c.apiKey.includes('YOUR_') &&
      c.projectId.length > 2
  );
}

const cfg = mergedConfig();
const shouldInit = configLooksUsable(cfg);

let app: FirebaseApp | undefined;
export let auth: Auth | null = null;
export let db: Firestore | null = null;

/** False when env disables Firebase, config is missing, or initialization throws. */
export let isFirebaseConfigured = false;

if (shouldInit) {
  try {
    app = initializeApp({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId
    });
    auth = getAuth(app);
    const rawDb = cfg.firestoreDatabaseId?.trim();
    db =
      !rawDb || rawDb === '(default)' ? getFirestore(app) : getFirestore(app, rawDb);
    isFirebaseConfigured = true;
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
