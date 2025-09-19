'use client';

import { Suspense, useState } from 'react'; // Import Suspense
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';

async function setSessionCookie(user) {
  const idToken = await user.getIdToken();
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
}

// Initializes trial/user doc quickly
async function initUser() {
  try { await fetch('/api/users/init', { method: 'POST' }); } catch {}
}

// Part 1: All your old page logic is now inside this new component
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const done = async (user) => {
    try {
      await setSessionCookie(user);
      await initUser();
    } catch {}
    router.replace(next);
  };

  const withBusy = (fn) => async () => {
    setErr('');
    setBusy(true);
    try { await fn(); }
    catch (e) { setErr(e?.message || 'Sign up failed'); }
    finally { setBusy(false); }
  };

  const signupEmail = withBusy(async () => {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await done(user);
  });

  const signupGoogle = withBusy(async () => {
    const prov = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, prov);
    await done(user);
  });

  const signupApple = withBusy(async () => {
    const prov = new OAuthProvider('apple.com');
    const { user } = await signInWithPopup(auth, prov);
    await done(user);
  });

  const signupFacebook = withBusy(async () => {
    const prov = new FacebookAuthProvider();
    const { user } = await signInWithPopup(auth, prov);
    await done(user);
  });

  return (
    <div className="w-full max-w-md p-8 space-y-6 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57]">
      <h1 className="text-2xl text-[#25edda] text-center">Sign up</h1>

      <div className="space-y-2">
        <button onClick={signupGoogle} disabled={busy}
          className="w-full rounded-full py-2 bg-white text-black font-semibold">Continue with Google</button>
        <button onClick={signupApple} disabled={busy}
          className="w-full rounded-full py-2 bg-black text-white border border-white/20">Continue with Apple</button>
        <button onClick={signupFacebook} disabled={busy}
          className="w-full rounded-full py-2 bg-[#1877F2] text-white font-semibold">Continue with Facebook</button>
      </div>

      <div className="border-t border-white/10 pt-4">
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" type="email"
               className="w-full mb-2 p-3 rounded-full bg-[#30333a] text-white"/>
        <input value={pass} onChange={(e)=>setPass(e.target.value)} placeholder="Password" type="password"
               className="w-full mb-3 p-3 rounded-full bg-[#30333a] text-white"/>
        <button onClick={signupEmail} disabled={busy}
          className="w-full rounded-full py-2 border border-[#25edda] text-[#25edda] hover:bg-[#25edda] hover:text-black">
          Create account with Email
        </button>
        {err && <p className="text-red-400 text-sm text-center mt-2">{err}</p>}
      </div>

      <p className="text-center text-gray-300 text-sm">
        Already have an account? <a className="text-[#25edda]" href={`/login?next=${encodeURIComponent(next)}`}>Login</a>
      </p>
    </div>
  );
}

// Part 2: The main page component is now very simple
export default function UserSignupPage() {
  return (
    <div className="min-h-screen bg-[#30333a] text-white flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}