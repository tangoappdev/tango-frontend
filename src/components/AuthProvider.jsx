// src/components/AuthProvider.jsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthGateModal from './AuthGateModal';

const Ctx = createContext(null);
export function useAuth() { return useContext(Ctx); }

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState({ tier: 'anon', isPro: false, trialActive: false });
  const [loading, setLoading] = useState(true);

  const [gateOpen, setGateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [initialAuthMode, setInitialAuthMode] = useState('login');

  // Fetch /api/users/me to know tier/flags
  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { cache: 'no-store' });
      const data = await res.json();
      setMe({
        tier: data?.tier ?? 'anon',
        isPro: !!data?.isPro || !!data?.trialActive,
        trialActive: !!data?.trialActive,
      });
    } catch {
      setMe({ tier: 'anon', isPro: false, trialActive: false });
    }
  }, []);

  // After Firebase auth changes, establish server session cookie and load "me"
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          // Create/refresh secure server session cookie
          const idToken = await u.getIdToken(true);
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          // Optionally initialize user doc on first login (safe if idempotent)
          // await fetch('/api/users/init', { method: 'POST' }).catch(()=>{});
        } else {
          // No client user → ensure server cookie is cleared (best-effort)
          await fetch('/api/auth/logout', { method: 'POST' }).catch(()=>{});
        }
      } finally {
        await refreshMe();
        setLoading(false);
      }
    });
    return () => unsub();
  }, [refreshMe]);

  // Gate: require login before running an action
  const requireAuth = useCallback((action, mode = 'login') => {
    if (auth.currentUser) { action?.(); return; }
    setInitialAuthMode(mode); // Set the mode we want the modal to open in
    setPendingAction(() => action);
    setGateOpen(true);
  }, []);

  // Logout helper (clears Firebase + server cookie)
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    await signOut(auth).catch(()=>{});
    setUser(null);
    setMe({ tier: 'anon', isPro: false, trialActive: false });
  }, []);

  return (
    <Ctx.Provider value={{
      user,
      loading,
      me,                 // { tier: 'anon'|'free'|'pro', isPro, trialActive }
      tier: me.tier,
      isPro: me.isPro,
      trialActive: me.trialActive,
      requireAuth,
      refreshMe,
      logout,
    }}>
      {children}
      <AuthGateModal
        initialMode={initialAuthMode}
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        afterAuth={() => {
          const fn = pendingAction;
          setPendingAction(null);
          fn?.();
          // "me" will refresh via onAuthStateChanged after session cookie is set
        }}
      />
    </Ctx.Provider>
  );
}
