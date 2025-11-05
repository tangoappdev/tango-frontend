// src/components/SignUpStepTwoModal.jsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebaseClient';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function SignUpStepTwoModal({ email, onClose, afterAuth }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSignUp = async () => {
    setErr('');
    if (!firstName || !password) {
      setErr('Please fill out all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErr('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`.trim(),
      });
      afterAuth(userCredential);
    } catch (error) {
      setErr(error.message || 'Failed to create account.');
    } finally {
      setBusy(false);
    }
  };

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
        <h2 className="text-xl font-semibold text-white text-center">Complete Account Creation</h2>
        <p className="text-center text-sm text-gray-400 -mt-2">{email}</p>
        
        <div className="mb-10 space-y-3 pt-2">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            type="text"
            autoComplete="given-name"
            className="w-full p-3 rounded-full bg-[#30333a] text-white shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name (Optional)"
            type="text"
            autoComplete="family-name"
            className="w-full p-3 mb-10 rounded-full bg-[#30333a] text-white shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="new-password"
            className="w-full p-3 rounded-full bg-[#30333a] text-white shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            type="password"
            autoComplete="new-password"
            className="w-full p-3 rounded-full bg-[#30333a] text-white shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
          />
        </div>

        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
        
        <button
          onClick={handleSignUp}
          disabled={busy || password !== confirmPassword || !password}
          className="w-full rounded-full py-2 border border-[#25edda] text-[#25edda] hover:bg-[#25edda] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-xs text-gray-400 text-center leading-relaxed">
          <span className="block">
            By clicking <span className="font-semibold text-white">Create Account</span>, you agree to
          </span>
          <span className="block mt-0.5">
            our <Link href="/terms" className="text-[#25edda] hover:underline">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="text-[#25edda] hover:underline">Privacy Policy</Link>.
          </span>
        </p>
      </div>
    </div>
  );
}
