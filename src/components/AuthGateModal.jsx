// src/components/AuthGateModal.jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebaseClient';
import { XMarkIcon } from '@heroicons/react/24/outline';
import SignUpStepTwoModal from './SignUpStepTwoModal';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  FacebookAuthProvider,
} from 'firebase/auth';

// --- SVG Icon Components ---
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
);

const AppleIcon = () => (
  <svg height="24" viewBox="0 0 24 24" width="24" fill="#ffffffff" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.195 4.513C15.873 3.69 16.351 2.567 16.351 1.433C16.351 1.278 16.341 1.123 16.318 1C15.206 1.044 13.872 1.734 13.083 2.668C12.449 3.379 11.871 4.513 11.871 5.647C11.871 5.825 11.905 5.991 11.916 6.047C11.982 6.058 12.094 6.08 12.216 6.08C13.206 6.08 14.45 5.413 15.195 4.513ZM15.973 6.313C14.317 6.313 12.961 7.325 12.093 7.325C11.171 7.325 9.97 6.38 8.525 6.38C5.779 6.38 3 8.648 3 12.918C3 15.586 4.023 18.398 5.301 20.211C6.391 21.744 7.347 23 8.725 23C10.081 23 10.682 22.1 12.371 22.1C14.083 22.1 14.472 22.978 15.973 22.978C17.463 22.978 18.453 21.61 19.397 20.265C20.442 18.72 20.887 17.219 20.897 17.142C20.809 17.119 17.963 15.952 17.963 12.695C17.963 9.871 20.198 8.604 20.331 8.504C18.852 6.381 16.596 6.314 15.973 6.314V6.313Z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <path fill="#1877F2" d="M20.181 35.87C29.094 34.791 36 27.202 36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 8.442 5.811 15.526 13.652 17.471L14 34h5.5l.681 1.87Z"/>
    <path fill="#FFFFFF" d="M13.651 35.471v-11.97H9.936V18h3.715v-2.37c0-6.127 2.772-8.964 8.784-8.964 1.138 0 3.103.223 3.91.446v4.983c-.425-.043-1.167-.065-2.081-.065-2.952 0-4.09 1.116-4.09 4.025V18h5.883l-1.008 5.5h-4.867v12.37a18.183 18.183 0 0 1-6.53-.399Z"/>
  </svg>
);

export default function AuthGateModal({ open, initialMode, onClose, afterAuth }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [mode, setMode] = useState(initialMode || 'login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [signupStep, setSignupStep] = useState(1);
  const [signupEmail, setSignupEmail] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }
    setMode(initialMode || 'login');
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const withBusy = useCallback((fn) => async () => {
    try {
      setBusy(true);
      setErr('');
      await fn();
    } catch (e) {
      setErr(e?.message ?? 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const finish = useCallback(async (cred) => {
    try {
      const idToken = await cred.user.getIdToken(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      await fetch('/api/users/init', { method: 'POST' });
      const params = new URLSearchParams(window.location.search);
      const dest = params.get('redirect') || '/player';
      window.location.assign(dest);
    } catch (e) {
      setErr(e.message ?? 'Auth failed');
    } finally {
      afterAuth?.(cred);
      onClose();
    }
  }, [afterAuth, onClose]);

  const handleEmailContinue = withBusy(async () => {
    if (!email) {
      setErr('Please enter an email address.');
      return;
    }
    const res = await fetch('/api/users/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      throw new Error('Something went wrong. Please try again.');
    }
    const data = await res.json();
    if (data.exists) {
      setErr('This email is already registered. Please sign in instead.');
    } else {
      setSignupEmail(email);
      setSignupStep(2);
    }
  });

  const google = withBusy(async () => {
    const prov = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, prov);
    await finish(cred);
  });

  const apple = withBusy(async () => {
    const prov = new OAuthProvider('apple.com');
    prov.addScope('email');
    prov.addScope('name');
    const cred = await signInWithPopup(auth, prov);
    await finish(cred);
  });

  const facebook = withBusy(async () => {
    const prov = new FacebookAuthProvider();
    const cred = await signInWithPopup(auth, prov);
    await finish(cred);
  });

  const emailLogin = withBusy(async () => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await finish(cred);
  });

  if (!open) {
    return null;
  }

  if (mode === 'register' && signupStep === 2) {
    return (
      <SignUpStepTwoModal
        email={signupEmail}
        onClose={onClose}
        afterAuth={finish}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#30333a] rounded-2xl p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-semibold text-white text-center">
          {mode === 'login' ? 'Login' : 'Create account'}
        </h2>

        <div className="border-t border-white/10 pt-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="email"
            className="w-full mb-2 p-3 rounded-full bg-[#30333a] text-white shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
          />
          {mode === 'login' && (
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              className="w-full mb-3 p-3 rounded-full bg-[#30333a] text-white shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
            />
          )}
          <button
            onClick={mode === 'login' ? emailLogin : handleEmailContinue}
            disabled={busy}
            className="w-full rounded-full py-2 border border-[#25edda] text-[#25edda] hover:bg-[#25edda] hover:text-black"
          >
            Continue
          </button>
          <p className="text-center text-gray-300 text-sm mt-3">
            or
          </p>
          {err && <p className="text-red-400 text-sm text-center mt-2">{err}</p>}
        </div>

        <div className="space-y-3">
          <button
            onClick={google}
            disabled={busy}
            className="w-full rounded-full py-2 bg-[#30333a] text-white border border-gray-500 flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            onClick={apple}
            disabled={busy}
            className="w-full rounded-full py-2 bg-[#30333a] text-white border border-gray-500 flex items-center justify-center gap-2"
          >
            <AppleIcon />
            Continue with Apple
          </button>
          <button
            onClick={facebook}
            disabled={busy}
            className="w-full rounded-full py-2 bg-[#30333a] text-white border border-gray-500 flex items-center justify-center gap-2"
          >
            <FacebookIcon />
            Continue with Facebook
          </button>
        </div>

        <p className="text-center text-gray-300 text-sm mt-3">
          {mode === 'login' ? 'No account?' : 'Already have an account?'}{' '}
          <button
            className="text-[#25edda]"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setSignupStep(1);
            }}
          >
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
