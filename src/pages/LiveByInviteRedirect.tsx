import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { Home } from 'lucide-react';

export function LiveByInviteRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code')?.trim();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setMessage('Add ?code=YOURCODE to the URL, or open the full link your director shared.');
      return;
    }
    if (!db) {
      setStatus('error');
      setMessage('Firebase is not configured on this site.');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const q = query(collection(db, 'tournaments'), where('inviteCode', '==', code.toUpperCase()));
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) {
          setStatus('error');
          setMessage(`No tournament found for code ${code.toUpperCase()}.`);
          return;
        }
        navigate(`/live/${snap.docs[0]!.id}`, { replace: true });
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setMessage('Could not look up that code. Check Firestore rules allow reads.');
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, db, navigate]);

  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100 p-6 text-center text-sm">
        <p>Firebase is not configured.</p>
        <Link to="/" className="text-sky-700 underline">
          <Home className="mb-1 inline h-4 w-4" /> Director setup
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100 p-6 text-center">
      {status === 'loading' && <p className="text-sm font-semibold text-zinc-700">Opening tournament…</p>}
      {status === 'error' && (
        <>
          <p className="max-w-md text-sm text-zinc-800">{message}</p>
          <Link to="/" className="text-sky-700 underline">
            Back home
          </Link>
        </>
      )}
    </div>
  );
}
