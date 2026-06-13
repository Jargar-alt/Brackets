import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

function getMissingConfigKeys(): string[] {
  return Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let authReadyPromise: Promise<string> | null = null;

export async function ensureAnonymousAuth(): Promise<string> {
  const missing = getMissingConfigKeys();
  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(", ")}. Set VITE_FIREBASE_* env vars in Vercel.`);
  }

  if (auth.currentUser?.uid) return auth.currentUser.uid;

  if (!authReadyPromise) {
    authReadyPromise = signInAnonymously(auth).then(() => {
      if (!auth.currentUser?.uid) {
        throw new Error("Authentication failed.");
      }
      return auth.currentUser.uid;
    });
  }

  try {
    return await authReadyPromise;
  } finally {
    authReadyPromise = null;
  }
}

export function subscribeToAuth(onUser: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, onUser);
}

export async function requireUid(): Promise<string> {
  return ensureAnonymousAuth();
}

export function formatFirebaseError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("permission-denied") || message.includes("Missing or insufficient permissions")) {
      return "Permission denied. You can only edit tournaments created in this browser session.";
    }
    if (message.includes("index")) {
      return "Firestore index is still building. Try again in a minute.";
    }
    if (message.includes("invalid-api-key")) {
      return "Invalid Firebase API key. Check Vercel env vars.";
    }
    return message;
  }
  return "Something went wrong. Please try again.";
}
