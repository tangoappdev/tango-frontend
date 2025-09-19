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
  const [me, setMe] = useState({ tier: 'anon', isPro: false, trialActive: false, likedTandaIds: [] });
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [initialAuthMode, setInitialAuthMode] = useState('login');

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { cache: 'no-store' });
      const data = await res.json();
      setMe({
        tier: data?.tier ?? 'anon',
        isPro: !!data?.isPro || !!data?.trialActive,
        trialActive: !!data?.trialActive,
        likedTandaIds: data?.likedTandaIds || [],
      });
    } catch {
      setMe({ tier: 'anon', isPro: false, trialActive: false, likedTandaIds: [] });
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          const idToken = await u.getIdToken(true);
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
        } else {
          await fetch('/api/auth/logout', { method: 'POST' }).catch(()=>{});
        }
      } finally {
        await refreshMe();
        setLoading(false);
      }
    });
    return () => unsub();
  }, [refreshMe]);

  const requireAuth = useCallback((action, mode = 'login') => {
    if (auth.currentUser) { action?.(); return; }
    setInitialAuthMode(mode);
    setPendingAction(() => action);
    setGateOpen(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    await signOut(auth).catch(()=>{});
    setUser(null);
    setMe({ tier: 'anon', isPro: false, trialActive: false, likedTandaIds: [] });
  }, []);

  const updateLikedIds = useCallback((newIdList) => {
  setMe(prev => ({ ...prev, likedTandaIds: newIdList }));
}, []);

  return (
    <Ctx.Provider value={{
      user,
      loading,
      me,
      tier: me.tier,
      isPro: me.isPro,
      trialActive: me.trialActive,
      likedTandaIds: me.likedTandaIds,
      requireAuth,
      refreshMe,
      logout,
      updateLikedIds,
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
        }}
      />
    </Ctx.Provider>
  );
}