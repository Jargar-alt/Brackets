import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, type Auth } from 'firebase/auth';

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  const message = (err as { message?: string })?.message ?? '';
  if (code === 'auth/unauthorized-domain') {
    return 'This site’s domain is not allowed. Firebase Console → Authentication → Settings → Authorized domains → add your host (e.g. localhost, your-app.vercel.app).';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is disabled. Firebase Console → Authentication → Sign-in method → enable Google.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return '';
  }
  return `Sign-in failed (${code || 'unknown'}). ${message}`.trim();
}

/**
 * Google sign-in for the director console. Tries popup first (works best on desktop dev);
 * falls back to full-page redirect if popup is blocked or unavailable.
 */
export async function signInWithGoogle(auth: Auth): Promise<{ ok: true } | { ok: false; message: string }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    auth.languageCode = typeof navigator !== 'undefined' ? navigator.language : 'en';
  } catch {
    /* ignore */
  }

  try {
    await signInWithPopup(auth, provider);
    return { ok: true };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const tryRedirect =
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment';
    if (tryRedirect) {
      try {
        await signInWithRedirect(auth, provider);
        return { ok: true };
      } catch (e2) {
        return { ok: false, message: friendlyError(e2) || friendlyError(e) };
      }
    }
    const msg = friendlyError(e);
    return { ok: false, message: msg };
  }
}
