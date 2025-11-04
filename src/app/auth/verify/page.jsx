import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useAuth } from '@/components/AuthProvider';

function VerifyLandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkEmailVerification } = useAuth();

  const [status, setStatus] = useState('loading'); // loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const oobCode = searchParams.get('oobCode');
    if (!oobCode) {
      setStatus('error');
      setErrorMessage('Missing verification code.');
      return;
    }

    const handleVerification = async () => {
      try {
        await applyActionCode(auth, oobCode);
        setStatus('success');
        console.log('[VerifyLandingPage] Email verification successful via oobCode.');
        await checkEmailVerification('verify-page-oobCode-success').catch(() => {});
      } catch (error) {
        setStatus('error');
        setErrorMessage(error.message || 'Failed to verify email.');
        console.error('[VerifyLandingPage] Email verification failed:', error);
      }
    };

    handleVerification();
  }, [searchParams, checkEmailVerification]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <span className="rounded-full border border-[#25edda]/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[#25edda]">
              Virtual Tango DJ
            </span>
            <h1 className="text-3xl font-semibold sm:text-4xl">Verifying your email...</h1>
            <p className="text-base leading-relaxed text-gray-200">
              Please wait while we confirm your email address.
            </p>
          </>
        );
      case 'success':
        return (
          <>
            <span className="rounded-full border border-[#25edda]/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[#25edda]">
              Virtual Tango DJ
            </span>
            <h1 className="text-3xl font-semibold sm:text-4xl">Email verified!</h1>
            <p className="text-base leading-relaxed text-gray-200">
              Thanks for confirming your email address. You can now return to the app.
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
          </>
        );
      case 'error':
        return (
          <>
            <span className="rounded-full border border-rose-400/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-rose-200">
              Error
            </span>
            <h1 className="text-3xl font-semibold sm:text-4xl">Verification Failed</h1>
            <p className="text-base leading-relaxed text-gray-200">
              {errorMessage || 'There was an issue verifying your email address. Please try again or contact support.'}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-full bg-[#25edda] px-6 py-2 text-sm font-semibold text-[#15232a] transition-transform duration-200 hover:scale-[1.02]"
              >
                Go to Home
              </button>
              <Link
                href="mailto:support@virtualtangodj.com"
                className="rounded-full border border-white/15 px-6 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
              >
                Contact Support
              </Link>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#121417] px-4 py-16 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 rounded-3xl border border-white/10 bg-[#1c2028] p-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        {renderContent()}
      </div>
    </main>
  );
}

export default function VerifyLandingPage() {
  return (
    <Suspense fallback={<div>Loading verification...</div>}>
      <VerifyLandingPageContent />
    </Suspense>
  );
}
