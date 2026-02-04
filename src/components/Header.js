'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/AuthProvider';

const navLinks = [
  { href: '/player', label: 'Player' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

const tangoAppLinks = [
  { href: '/home', label: 'Home' },
  { href: '/milonga-guide', label: 'Milonga Guide' },
  { href: '/tango-festivals-marathons', label: 'Festivals & Marathons' },
  { href: '/', label: 'Virtual DJ' },
];

function NavLink({ href, label, isActive, onClick }) {
  const baseClasses =
    'w-full md:w-auto px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200';
  const activeClasses = 'text-[#25edda] bg-[#25edda]/10';
  const inactiveClasses = 'text-gray-200 hover:text-white hover:bg-white/5';
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    requireAuth,
    logout,
    me,
    trialActive,
    emailVerified,
    sendEmailVerification,
    sendVerificationState,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const isTrial = !!trialActive;
  const isPro = !!me?.isPro && !isTrial;
  const isFree = !isPro && !isTrial;
  const [isTangoAppSite, setIsTangoAppSite] = useState(false);
  const brandName = isTangoAppSite ? 'TangoApp' : 'Virtual Tango DJ';
  const headerLinks = isTangoAppSite ? tangoAppLinks : navLinks;
  const badgeLabel = isPro || isTrial ? 'Pro' : isFree ? 'Free' : null;
  const badgeClass =
    isPro || isTrial ? 'bg-[#25edda] text-[#1f2126]' : 'bg-white text-[#30333a]';
  const showStatusBadge = !!badgeLabel;

  const isActive = (href) => {
    if (href === '/') {
      return pathname === '/' || pathname.startsWith('/player');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleUpgrade = () => {
    requireAuth(() => {
      router.push('/pricing');
    }, 'pricing');
    setUserMenuOpen(false);
  };

  const handleSignIn = () => {
    requireAuth(() => {
      router.push('/player');
    }, 'login');
    setUserMenuOpen(false);
  };

  const handleCreateAccount = () => {
    requireAuth(() => {
      router.push('/player');
    }, 'register');
    setUserMenuOpen(false);
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  const handleManageSubscription = () => {
    setUserMenuOpen(false);
    setMenuOpen(false);
    requireAuth(() => {
      router.push('/manage_subscription');
    }, 'login');
  };

  const trialDaysLeft = useMemo(() => {
    if (!trialActive) return null;
    const trialEndsAt = me?.trialEndsAt ?? 0;
    if (!trialEndsAt) return null;
    const msRemaining = trialEndsAt - Date.now();
    const days = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    if (Number.isNaN(days)) return null;
    return Math.max(days, 0);
  }, [me?.trialEndsAt, trialActive]);

  const trialBadgeText = useMemo(() => {
    if (trialDaysLeft === null) return null;
    if (trialDaysLeft <= 0) return 'Trial ends today';
    return `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left`;
  }, [trialDaysLeft]);
  const trialBadgeLabel = useMemo(() => {
    if (!isTrial) return null;
    if (!trialBadgeText) return 'Free Trial';
    return `Free Trial - ${trialBadgeText}`;
  }, [isTrial, trialBadgeText]);

  const verificationSending = sendVerificationState?.sending ?? false;
  const verificationError = sendVerificationState?.error ?? null;
  const verificationSuccess = sendVerificationState?.success ?? false;
  const verificationRetryAfter = sendVerificationState?.retryAfter ?? 0;

  const handleSendVerificationEmail = useCallback(() => {
    if (verificationSending) return;
    sendEmailVerification?.();
  }, [verificationSending, sendEmailVerification]);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname.toLowerCase();
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]';
    setIsTangoAppSite(
      isLocal || host === 'tangoapp.ar' || host === 'www.tangoapp.ar'
    );
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (!headerRef.current) return;
      const { height } = headerRef.current.getBoundingClientRect();
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${height}px`
      );
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#30333a]/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-[85rem] items-center justify-between px-8 py-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="flex w-full md:w-auto items-center justify-center md:justify-start gap-3 text-white text-center md:text-left"
        >
          <Image
            src={isTangoAppSite ? '/tangoappicon.png' : '/favicon.ico'}
            alt={`${brandName} logo`}
            width={36}
            height={36}
            className={isTangoAppSite ? 'h-9 w-auto' : 'h-9 w-9 rounded-lg'}
            priority
          />
          <div className="flex flex-col leading-tight">
            <span
              className={`font-semibold tracking-wide text-[#25edda] flex items-center gap-2 ${
                isTangoAppSite ? 'text-lg normal-case' : 'text-base uppercase'
              }`}
            >
              {brandName}
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#25edda] text-[#1f2126]">
                Beta
              </span>
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-3 md:flex">
          {headerLinks
            .filter((link) => link.href !== '/pricing' || !user || isTrial || isFree)
            .map((link) => (
            <NavLink
              key={link.href}
              {...link}
              isActive={isActive(link.href)}
              onClick={() => setMenuOpen(false)}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          {user ? (
            <>
              {isTrial && trialBadgeLabel && (
                <span className="text-xs font-semibold uppercase tracking-wide text-[#25edda]">
                  {trialBadgeLabel}
                </span>
              )}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#25edda]/10 text-sm font-semibold text-white"
                  title={user.displayName || user.email || 'Account'}
                >
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt="User avatar"
                      width={40}
                      height={40}
                      className="h-full w-full rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    (user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()
                  )}
                </button>
                {showStatusBadge && (
                  <span
                    className={`absolute -top-[5px] -right-[20px] rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      badgeClass
                    }`}
                  >
                    {badgeLabel}
                  </span>
                )}
                {userMenuOpen && (
                  <>
                    <button
                      className="fixed inset-0 z-0 cursor-default"
                      aria-label="Close account menu"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-10 mt-3 w-48 rounded-xl border border-white/10 bg-[#30333a] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
                      <div className="mb-3 text-xs text-gray-400">
                        {user.displayName || user.email}
                      </div>
                      {!emailVerified && (
                        <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                          <p className="font-semibold text-amber-200">Verify your email</p>
                          <p className="mt-1 leading-relaxed text-amber-100/80">
                            Confirm your address to keep your account secure and receive updates.
                          </p>
                          <button
                            onClick={handleSendVerificationEmail}
                            disabled={verificationSending}
                            className="mt-2 w-full rounded-full border border-amber-300/60 px-3 py-1.5 text-sm font-semibold text-amber-100 transition-colors duration-200 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {verificationSending ? 'Sending…' : 'Send verification email'}
                          </button>
                          {verificationSuccess && (
                            <p className="mt-2 text-[11px] text-emerald-200">
                              Verification email sent. Check your inbox.
                            </p>
                          )}
                          {verificationError && (
                            <p className="mt-2 text-[11px] text-rose-200">
                              {verificationError}
                              {verificationRetryAfter > 0 ? ` Try again in ${verificationRetryAfter}s.` : ''}
                            </p>
                          )}
                        </div>
                      )}
                      <button
                        onClick={handleManageSubscription}
                        className="mb-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                      >
                        Manage Subscription
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
              {!isPro && (
                <button
                  onClick={handleUpgrade}
                  className="rounded-full border border-[#25edda] px-4 py-1 text-sm font-semibold text-[#25edda] transition-colors duration-200 hover:bg-[#25edda]/10"
                >
                  Upgrade
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleSignIn}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:text-white hover:bg-white/5"
              >
                Sign in
              </button>
              <button
                onClick={handleCreateAccount}
                className="rounded-full border border-[#25edda] bg-[#30333a] px-4 py-2 text-sm font-semibold text-[#25edda] transition duration-200 transform hover:bg-[#25edda] hover:text-[#30333a] hover:scale-[1.03]"
              >
                Create account
              </button>
            </>
          )}
        </div>

        {user ? (
          <button
            className="relative flex h-11 w-11 min-w-[2.75rem] min-h-[2.75rem] items-center justify-center rounded-full border border-white/10 bg-[#25edda]/10 text-sm font-semibold text-white md:hidden"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
          >
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt="User avatar"
                width={44}
                height={44}
                className="h-full w-full rounded-full object-cover"
                style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', objectFit: 'cover' }}
                unoptimized
              />
            ) : (
              (user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()
            )}
            {showStatusBadge && (
              <span
                className={`absolute -top-[4px] -right-[18px] rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
              >
                {badgeLabel}
              </span>
            )}
          </button>
        ) : (
          <button
            className="rounded-full border border-white/15 p-2 text-gray-200 transition-colors duration-200 hover:text-white md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-[#30333a] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {headerLinks
              .filter((link) => link.href !== '/pricing' || !user || isTrial || isFree)
              .map((link) => (
              <NavLink
                key={link.href}
                {...link}
                isActive={isActive(link.href)}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {showStatusBadge ? (
              <div className="mx-auto flex flex-col items-center leading-tight">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  (isPro || isTrial) ? 'border border-[#25edda] text-[#25edda]' : 'border border-white text-[#30333a] bg-white'
                }`}>
                  {badgeLabel}
                </span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleUpgrade();
                  }}
                  className="w-full rounded-full border border-[#25edda] px-4 py-2 text-sm font-semibold text-[#25edda] transition-colors duration-200 hover:bg-[#25edda]/10"
                >
                  Upgrade
                </button>
                {trialBadgeLabel && (
                  <span className="text-center text-xs font-semibold uppercase tracking-wide text-[#25edda]">
                    {trialBadgeLabel}
                  </span>
                )}
              </>
            )}
            {user ? (
              <>
                <div className="rounded-lg border border-white/10 bg-[#30333a] px-4 py-3 text-sm text-gray-300">
                  <p className="text-xs uppercase text-gray-500">Signed in as</p>
                  <p className="truncate">{user.displayName || user.email}</p>
                </div>
                {!emailVerified && (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <p className="font-semibold text-amber-200">Verify your email</p>
                    <p className="mt-1 text-amber-100/80">
                      Tap below and follow the link we send to confirm your address.
                    </p>
                    <button
                      onClick={() => {
                        handleSendVerificationEmail();
                      }}
                      disabled={verificationSending}
                      className="mt-2 w-full rounded-full border border-amber-300/60 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors duration-200 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {verificationSending ? 'Sending…' : 'Send verification email'}
                    </button>
                    {verificationSuccess && (
                      <p className="mt-2 text-[11px] text-emerald-200">
                        Verification email sent. Check your inbox.
                      </p>
                    )}
                    {verificationError && (
                      <p className="mt-2 text-[11px] text-rose-200">
                        {verificationError}
                        {verificationRetryAfter > 0 ? ` Try again in ${verificationRetryAfter}s.` : ''}
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    handleManageSubscription();
                  }}
                  className="w-full rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:text-white hover:bg-white/5"
                >
                  Manage subscription
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:text-white hover:bg-white/5"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignIn();
                  }}
                  className="w-full rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:text-white hover:bg-white/5"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleCreateAccount();
                  }}
                  className="w-full rounded-full border border-[#25edda] bg-[#30333a] px-4 py-2 text-sm font-semibold text-[#25edda] transition duration-200 transform hover:bg-[#25edda] hover:text-[#30333a] hover:scale-[1.03]"
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}



