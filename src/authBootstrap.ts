import { auth } from './firebase';
import {
  browserLocalPersistence,
  getRedirectResult,
  setPersistence
} from 'firebase/auth';

const REDIRECT_ERR_KEY = 'brackets_auth_redirect_error';

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  const message = (err as { message?: string })?.message ?? '';
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not allowed for sign-in. In Firebase Console → Authentication → Settings → Authorized domains, add your exact site host (e.g. your-app.vercel.app and any custom domain).';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled. In Firebase Console → Authentication → Sign-in method, enable Google.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with a different sign-in method.';
  }
  return `Sign-in did not complete (${code || 'unknown'}). ${message}`.trim();
}

/**
 * Run before React mounts so `getRedirectResult` runs once (Strict Mode won’t consume it twice)
 * and local persistence is applied before any session is written.
 */
export async function completeAuthRedirect(): Promise<void> {
  if (!auth) return;
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    /* already configured or unsupported */
  }
  try {
    await getRedirectResult(auth);
  } catch (e) {
    console.error('[Auth] getRedirectResult', e);
    try {
      sessionStorage.setItem(REDIRECT_ERR_KEY, friendlyAuthError(e));
    } catch {
      /* storage blocked */
    }
  }
}

export function consumeAuthRedirectError(): string | null {
  try {
    const v = sessionStorage.getItem(REDIRECT_ERR_KEY);
    if (v) sessionStorage.removeItem(REDIRECT_ERR_KEY);
    return v;
  } catch {
    return null;
  }
}
