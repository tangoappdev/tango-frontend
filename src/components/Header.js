'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/AuthProvider';

const navLinks = [
  { href: '/', label: 'Player' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/upgrade', label: 'Upgrade' },
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
  const { user, requireAuth, logout, me, trialActive } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const headerRef = useRef(null);

  const isActive = (href) => {
    if (href === '/') {
      return pathname === '/' || pathname.startsWith('/player');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleUpgrade = () => {
    requireAuth(() => {
      router.push('/upgrade');
    }, 'upgrade');
    setUserMenuOpen(false);
  };

  const handleSignIn = () => {
    requireAuth(() => {
      router.push('/player');
    }, 'login');
    setUserMenuOpen(false);
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await logout();
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

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

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
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="flex w-full md:w-auto items-center justify-center md:justify-start gap-3 text-white text-center md:text-left"
        >
          <Image
            src="/favicon.ico"
            alt="Virtual Tango DJ logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-wide uppercase text-[#25edda] flex items-center gap-2">
              Virtual Tango DJ
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#25edda] text-[#1f2126]">
                Beta
              </span>
            </span>
            <span className="text-xs text-gray-400">Authentic milonga vibes, on demand</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-3 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              {...link}
              isActive={isActive(link.href)}
              onClick={() => setMenuOpen(false)}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <button
                onClick={handleUpgrade}
                className="rounded-full border border-[#25edda] px-4 py-2 text-sm font-semibold text-[#25edda] transition-colors duration-200 hover:bg-[#25edda]/10"
              >
                Upgrade
              </button>
              {trialBadgeText && (
                <span className="text-xs font-medium text-[#25edda]">
                  {trialBadgeText}
                </span>
              )}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#25edda]/10 text-sm font-semibold text-white"
                  title={user.displayName || user.email || 'Account'}
                >
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt="User avatar"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    (user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()
                  )}
                </button>
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
            </>
          ) : (
            <>
              <button
                onClick={handleUpgrade}
                className="rounded-full border border-[#25edda] px-4 py-2 text-sm font-semibold text-[#25edda] transition-colors duration-200 hover:bg-[#25edda]/10"
              >
                Upgrade
              </button>
              <button
                onClick={handleSignIn}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:text-white hover:bg-white/5"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <button
          className="rounded-full border border-white/15 p-2 text-gray-200 transition-colors duration-200 hover:text-white md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-[#30333a] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                isActive={isActive(link.href)}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={() => {
                setMenuOpen(false);
                handleUpgrade();
              }}
              className="w-full rounded-full border border-[#25edda] px-4 py-2 text-sm font-semibold text-[#25edda] transition-colors duration-200 hover:bg-[#25edda]/10"
            >
              Upgrade
            </button>
            {trialBadgeText && (
              <span className="text-center text-xs font-medium text-[#25edda]">
                {trialBadgeText}
              </span>
            )}
            {user ? (
              <>
                <div className="rounded-lg border border-white/10 bg-[#30333a] px-4 py-3 text-sm text-gray-300">
                  <p className="text-xs uppercase text-gray-500">Signed in as</p>
                  <p className="truncate">{user.displayName || user.email}</p>
                </div>
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
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleSignIn();
                }}
                className="w-full rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:text-white hover:bg-white/5"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
