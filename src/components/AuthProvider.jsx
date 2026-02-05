// src/components/AuthProvider.jsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthGateModal from './AuthGateModal';

const Ctx = createContext(null);
export function useAuth() { return useContext(Ctx); }

const createEmptyMe = () => ({
  tier: 'anon',
  isPro: false,
  trialActive: false,
  trialEndsAt: 0,
  subscriptionStatus: null,
  planId: null,
  currentPeriodEnd: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  likedTandaIds: [],
  likedCortinaIds: [],
  likedMixedOrder: [],
  advancedAccess: false,
  isAdmin: false,
});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(createEmptyMe);
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [initialAuthMode, setInitialAuthMode] = useState('login');
  const [sendVerificationState, setSendVerificationState] = useState({
    sending: false,
    error: null,
    success: false,
    lastSentAt: null,
    retryAfter: 0,
  });

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { cache: 'no-store' });
      const data = await res.json();
      setMe({
        tier: data?.tier ?? 'anon',
        isPro: !!data?.isPro || !!data?.trialActive,
        trialActive: !!data?.trialActive,
        trialEndsAt: data?.trialEndsAt ?? 0,
        subscriptionStatus: data?.subscriptionStatus ?? null,
        planId: data?.planId ?? null,
        currentPeriodEnd: data?.currentPeriodEnd ?? null,
        stripeCustomerId: data?.stripeCustomerId ?? null,
        stripeSubscriptionId: data?.stripeSubscriptionId ?? null,
        likedTandaIds: data?.likedTandaIds || [],
        likedCortinaIds: data?.likedCortinaIds || [],
        likedMixedOrder: data?.likedMixedOrder || [],
        advancedAccess: !!data?.advancedAccess,
        isAdmin: !!data?.isAdmin,
      });
    } catch {
      setMe(createEmptyMe());
    }
  }, []);

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
    setMe(createEmptyMe());
  }, []);

  const updateLikedIds = useCallback((newIdList) => {
    setMe(prev => ({ ...prev, likedTandaIds: newIdList }));
  }, []);

  const updateLikedCortinaIds = useCallback((newIdList) => {
    setMe(prev => ({ ...prev, likedCortinaIds: newIdList }));
  }, []);

  const updateLikedMixedOrder = useCallback((newOrder) => {
    setMe(prev => ({ ...prev, likedMixedOrder: Array.isArray(newOrder) ? newOrder : [] }));
  }, []);

  const refreshAuthSession = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          await refreshAuthSession();
        } else {
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        }
      } finally {
        await refreshMe();
        setLoading(false);
      }
    });
    return () => unsub();
  }, [refreshAuthSession, refreshMe]);

  const sendEmailVerification = useCallback(async () => {
    setSendVerificationState({ sending: true, error: null, success: false, lastSentAt: null, retryAfter: 0 });
    try {
      const res = await fetch('/api/auth/send-verification', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const retryAfter = data?.retryAfter ?? 0;
        const message = data?.error || 'Failed to send verification email.';
        setSendVerificationState({
          sending: false,
          error: message,
          success: false,
          lastSentAt: null,
          retryAfter,
        });
        throw new Error(message);
      }
      const sentAt = new Date();
      setSendVerificationState({
        sending: false,
        error: null,
        success: true,
        lastSentAt: sentAt,
        retryAfter: 0,
      });
      return { success: true };
    } catch (error) {
      if (!(error instanceof Error)) return { success: false, error: 'Failed to send verification email.' };
      return { success: false, error: error.message };
    }
  }, []);

  const [checkingVerification, setCheckingVerification] = useState(false);

  const handleVerificationSuccess = useCallback(async () => {
    console.info('[email-verification] email verified. refreshing session/profile');
    setUser((prev) => (prev ? { ...prev, emailVerified: true } : prev));
    setSendVerificationState({
      sending: false,
      error: null,
      success: false,
      lastSentAt: null,
      retryAfter: 0,
    });
    await refreshAuthSession();
    await refreshMe();
  }, [refreshAuthSession, refreshMe]);

  const needsEmailVerification = useMemo(() => {
    if (!user) return false;
    const providers = Array.isArray(user.providerData) ? user.providerData : [];
    const usesPasswordProvider = providers.some((provider) => provider?.providerId === 'password');
    return usesPasswordProvider && user.emailVerified === false;
  }, [user]);

  const checkEmailVerification = useCallback(async (reason = 'manual') => {
    if (!auth.currentUser) return;
    setCheckingVerification(true);
    try {
      console.info('[email-verification] checking verification status', { reason });
      await auth.currentUser.reload();
      const refreshed = auth.currentUser;
      const verified = !!refreshed?.emailVerified;
      console.info('[email-verification] reload complete', {
        providerIds: refreshed?.providerData?.map(p => p?.providerId) || [],
        emailVerified: verified,
        uid: refreshed?.uid,
      });
      setUser(refreshed ?? null);
      if (!verified) {
        try {
          const res = await fetch('/api/auth/status', { method: 'GET', cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            console.info('[email-verification] server status check', data);
            if (data?.emailVerified) {
              await handleVerificationSuccess();
              return;
            }
          } else {
            console.warn('[email-verification] server status check failed', res.status);
          }
        } catch (statusError) {
          console.warn('[email-verification] status endpoint error', statusError);
        }
      } else {
        await handleVerificationSuccess();
      }
    } catch (error) {
      console.error('[email-verification] reload failed', error);
    } finally {
      setCheckingVerification(false);
    }
  }, [refreshAuthSession, refreshMe, handleVerificationSuccess]);

  useEffect(() => {
    if (!user) {
      setSendVerificationState({
        sending: false,
        error: null,
        success: false,
        lastSentAt: null,
        retryAfter: 0,
      });
    }
  }, [user]);

  useEffect(() => {
    if (
      needsEmailVerification &&
      !sendVerificationState.sending &&
      !sendVerificationState.success &&
      !sendVerificationState.lastSentAt &&
      !sendVerificationState.error
    ) {
      sendEmailVerification().catch(() => {});
    }
  }, [
    needsEmailVerification,
    sendVerificationState.sending,
    sendVerificationState.success,
    sendVerificationState.lastSentAt,
    sendVerificationState.error,
    sendEmailVerification,
  ]);

  useEffect(() => {
    if (!needsEmailVerification || typeof window === 'undefined') return undefined;

    const handleFocusCheck = () => {
      checkEmailVerification('focus').catch(() => {});
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkEmailVerification('visibility').catch(() => {});
      }
    };

    window.addEventListener('focus', handleFocusCheck);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocusCheck);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [needsEmailVerification, checkEmailVerification]);

  useEffect(() => {
    if (!needsEmailVerification || !sendVerificationState.success) return undefined;

    const timer = setTimeout(() => {
      checkEmailVerification('post-success').catch(() => {});
    }, 5000);

    return () => clearTimeout(timer);
  }, [needsEmailVerification, sendVerificationState.success, checkEmailVerification]);

  const hasAdvancedAccess = useMemo(() => {
    return (me.advancedAccess === true) || (me.isPro && !me.trialActive);
  }, [me.advancedAccess, me.isPro, me.trialActive]);

  return (
    <Ctx.Provider value={{
      user,
      loading,
      me,
      tier: me.tier,
      isPro: me.isPro,
      trialActive: me.trialActive,
      trialEndsAt: me.trialEndsAt,
      subscriptionStatus: me.subscriptionStatus,
      planId: me.planId,
      currentPeriodEnd: me.currentPeriodEnd,
      stripeCustomerId: me.stripeCustomerId,
      stripeSubscriptionId: me.stripeSubscriptionId,
      likedTandaIds: me.likedTandaIds,
      likedCortinaIds: me.likedCortinaIds,
      likedMixedOrder: me.likedMixedOrder,
      advancedAccess: me.advancedAccess,
      hasAdvancedAccess,
      isAdmin: me.isAdmin,
      requireAuth,
      refreshMe,
      logout,
      updateLikedIds,
      updateLikedCortinaIds,
      updateLikedMixedOrder,
      emailVerified: !!user?.emailVerified,
      sendVerificationState,
      sendEmailVerification,
      needsEmailVerification,
      checkEmailVerification,
      checkingVerification,
    }}>
      {children}
      {needsEmailVerification && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#07090d]/90 px-4 py-10">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-white/10 bg-[#1f232b] p-8 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <h2 className="text-2xl font-semibold text-white">Verify your email to continue</h2>
            <p className="text-sm leading-relaxed text-gray-300">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-[#25edda]">{user?.email}</span>. Please open that email, click the
              verification button, then choose “I&apos;ve verified” below to unlock Virtual Tango DJ.
            </p>
            {sendVerificationState.success && (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Verification email sent. Check your inbox (and spam) for the link.
              </div>
            )}
            {sendVerificationState.error && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {sendVerificationState.error}
                {sendVerificationState.retryAfter > 0 ? ` Try again in ${sendVerificationState.retryAfter}s.` : ''}
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  checkEmailVerification('button').catch(() => {});
                }}
                disabled={checkingVerification}
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 disabled:cursor-progress disabled:opacity-60"
              >
                {checkingVerification ? 'Checking…' : "I've verified"}
              </button>
              <button
                type="button"
                onClick={() => { sendEmailVerification().catch(() => {}); }}
                disabled={sendVerificationState.sending}
                className="rounded-full bg-[#25edda] px-5 py-2 text-sm font-semibold text-[#132329] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendVerificationState.sending ? 'Sending…' : 'Resend email'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Need to use a different address?{' '}
              <button
                type="button"
                onClick={logout}
                className="font-semibold text-[#25edda] hover:underline"
              >
                Sign out
              </button>
            </p>
          </div>
        </div>
      )}
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
