'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithEmailAndPassword,
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

export default function UserLoginPage() {
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
    } catch {}
    router.replace(next);
  };

  const withBusy = (fn) => async () => {
    setErr('');
    setBusy(true);
    try { await fn(); }
    catch (e) { setErr(e?.message || 'Login failed'); }
    finally { setBusy(false); }
  };

  const loginEmail = withBusy(async () => {
    const { user } = await signInWithEmailAndPassword(auth, email, pass);
    await done(user);
  });

  const loginGoogle = withBusy(async () => {
    const prov = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, prov);
    await done(user);
  });

  const loginApple = withBusy(async () => {
    const prov = new OAuthProvider('apple.com');
    const { user } = await signInWithPopup(auth, prov);
    await done(user);
  });

  const loginFacebook = withBusy(async () => {
    const prov = new FacebookAuthProvider();
    const { user } = await signInWithPopup(auth, prov);
    await done(user);
  });

  return (
    <div className="min-h-screen bg-[#30333a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-6 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57]">
        <h1 className="text-2xl text-[#25edda] text-center">Login</h1>

        <div className="space-y-2">
          <button onClick={loginGoogle} disabled={busy}
            className="w-full rounded-full py-2 bg-white text-black font-semibold">Continue with Google</button>
          <button onClick={loginApple} disabled={busy}
            className="w-full rounded-full py-2 bg-black text-white border border-white/20">Continue with Apple</button>
          <button onClick={loginFacebook} disabled={busy}
            className="w-full rounded-full py-2 bg-[#1877F2] text-white font-semibold">Continue with Facebook</button>
        </div>

        <div className="border-t border-white/10 pt-4">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" type="email"
                 className="w-full mb-2 p-3 rounded-full bg-[#30333a] text-white"/>
          <input value={pass} onChange={(e)=>setPass(e.target.value)} placeholder="Password" type="password"
                 className="w-full mb-3 p-3 rounded-full bg-[#30333a] text-white"/>
          <button onClick={loginEmail} disabled={busy}
            className="w-full rounded-full py-2 border border-[#25edda] text-[#25edda] hover:bg-[#25edda] hover:text-black">
            Login with Email
          </button>
          {err && <p className="text-red-400 text-sm text-center mt-2">{err}</p>}
        </div>

        <p className="text-center text-gray-300 text-sm">
          Don’t have an account? <a className="text-[#25edda]" href={`/signup?next=${encodeURIComponent(next)}`}>Sign up</a>
        </p>
      </div>
    </div>
  );
}
