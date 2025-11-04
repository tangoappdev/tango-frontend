'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function VerifyLandingPage() {
  const router = useRouter();
  const { checkEmailVerification } = useAuth();

  useEffect(() => {
    checkEmailVerification('verify-page-mount').catch(() => {});
  }, [checkEmailVerification]);

  return (
    <main className="min-h-screen bg-[#121417] px-4 py-16 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 rounded-3xl border border-white/10 bg-[#1c2028] p-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <span className="rounded-full border border-[#25edda]/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[#25edda]">
          Virtual Tango DJ
        </span>
        <h1 className="text-3xl font-semibold sm:text-4xl">Email verified!</h1>
        <p className="text-base leading-relaxed text-gray-200">
          Thanks for confirming your email address. Return to the app and select “I&apos;ve verified” to continue.
          You can close this tab if it opened in a new window.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-full bg-[#25edda] px-6 py-2 text-sm font-semibold text-[#15232a] transition-transform duration-200 hover:scale-[1.02]"
          >
            Go to Virtual Tango DJ
          </button>
          <Link
            href="mailto:support@virtualtangodj.com"
            className="rounded-full border border-white/15 px-6 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
          >
            Need help?
          </Link>
        </div>
      </div>
    </main>
  );
}
