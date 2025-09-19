'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';

async function setSessionCookie(user) {
  const idToken = await user.getIdToken();
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      await setSessionCookie(user);
      router.replace('/admin');
    } catch (e) {
      setErr('Failed to log in. Check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#30333a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-6 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57]">
        <h1 className="text-2xl text-[#25edda] text-center">Admin Login</h1>
        <form onSubmit={submit} className="space-y-6">
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" required
            className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]" />
          <input type="password" value={pass} onChange={(e)=>setPass(e.target.value)} placeholder="Password" required
            className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]" />
          {err && <p className="text-red-400 text-sm text-center">{err}</p>}
          <button type="submit" disabled={busy}
            className="w-full h-12 rounded-full border-2 border-[#25edda] font-bold transition duration-150 ease-in-out text-[#25edda] hover:bg-[#25edda] hover:text-[#30333a]">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
