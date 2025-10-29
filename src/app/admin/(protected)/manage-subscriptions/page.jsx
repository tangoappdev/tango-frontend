'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, MagnifyingGlassIcon, ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 10;

function TierBadge({ tier }) {
  const tone =
    tier === 'pro'
      ? 'bg-[#25edda]/15 text-[#25edda]'
      : tier === 'trial'
      ? 'bg-amber-500/15 text-amber-200'
      : 'bg-white/10 text-gray-200';
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>
      {tier || 'free'}
    </span>
  );
}

function RowActions({ onAction, busy }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (busy) {
      setOpen(false);
    }
  }, [busy]);

  const handleSelect = useCallback(
    (action, options = {}) => {
      if (busy) return;
      setOpen(false);
      onAction({ action, ...options });
    },
    [busy, onAction]
  );

  return (
    <div className="relative inline-block text-right">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={busy}
        className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Updating...' : 'Actions'}
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#3e424b] shadow-lg">
          <div className="flex flex-col text-left text-xs">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSelect('grant_pro_days', { days: 30 })}
              className="px-3 py-2 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Grant Pro 30 days
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSelect('grant_pro_days', { days: 90 })}
              className="px-3 py-2 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Grant Pro 90 days
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSelect('set_pro_permanent')}
              className="px-3 py-2 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set Pro (permanent)
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSelect('set_trial_days', { days: 7 })}
              className="px-3 py-2 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add 7 days Trial
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSelect('clear_manual')}
              className="px-3 py-2 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear Manual Override
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSelect('set_free')}
              className="px-3 py-2 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set Free
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSelect('delete_account')}
              className="px-3 py-2 text-left text-rose-300 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: undefined,
  }).format(date);
}

function formatLocation(location) {
  if (!location || typeof location !== 'object') return '—';
  const { city, region, country, countryCode } = location;
  const parts = [city, region, country].filter(Boolean);
  if (parts.length === 0 && countryCode) parts.push(countryCode);
  return parts.length > 0 ? parts.join(', ') : '—';
}

async function fetchUsers({ pageToken, query }) {
  const params = new URLSearchParams();
  params.set('pageSize', PAGE_SIZE.toString());
  if (pageToken) params.set('pageToken', pageToken);
  if (query) params.set('q', query);
  const res = await fetch(`/api/admin/users/list?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || 'Failed to load users');
  }
  return json;
}

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
}) {
  const start = totalItems === 0 ? 0 : currentPage * pageSize + 1;
  const end = totalItems === 0 ? 0 : Math.min(totalItems, start + pageSize - 1);
  const rangeLabel = totalItems === 0 ? '0 of 0' : `${start}-${end} of ${totalItems}`;
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl text-sm text-gray-200">
      <span className="text-xs tracking-wide text-gray-300 sm:text-sm">{rangeLabel}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={disablePrev}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-full font-medium transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">&lt;</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={disableNext}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-full font-medium transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">&gt;</span>
        </button>
      </span>
    </div>
  );
}

export default function ManageSubscriptionsPage() {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [copiedSubscriptionId, setCopiedSubscriptionId] = useState(null);
  const [copiedCustomerId, setCopiedCustomerId] = useState(null);
  const [actionBusyUid, setActionBusyUid] = useState(null);
  const subscriptionCopyTimeoutRef = useRef(null);
  const customerCopyTimeoutRef = useRef(null);

  const totalPages = useMemo(() => {
    if (allUsers.length === 0) return 0;
    return Math.ceil(allUsers.length / PAGE_SIZE);
  }, [allUsers.length]);

  const handleSubscriptionCopy = useCallback(async (id) => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
    } catch (err) {
      console.error('Failed to copy subscription ID', err);
      return;
    }
    setCopiedSubscriptionId(id);
    if (subscriptionCopyTimeoutRef.current) {
      clearTimeout(subscriptionCopyTimeoutRef.current);
    }
    subscriptionCopyTimeoutRef.current = setTimeout(() => {
      setCopiedSubscriptionId(null);
      subscriptionCopyTimeoutRef.current = null;
    }, 2000);
  }, []);

  const handleCustomerCopy = useCallback(async (id) => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
    } catch (err) {
      console.error('Failed to copy customer ID', err);
      return;
    }
    setCopiedCustomerId(id);
    if (customerCopyTimeoutRef.current) {
      clearTimeout(customerCopyTimeoutRef.current);
    }
    customerCopyTimeoutRef.current = setTimeout(() => {
      setCopiedCustomerId(null);
      customerCopyTimeoutRef.current = null;
    }, 2000);
  }, []);

  const currentUsers = useMemo(() => {
    if (allUsers.length === 0) return [];
    const start = currentPage * PAGE_SIZE;
    return allUsers.slice(start, start + PAGE_SIZE);
  }, [allUsers, currentPage]);

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(0);
      return;
    }
    setCurrentPage(prev => {
      const lastIndex = totalPages - 1;
      return Math.min(prev, lastIndex);
    });
  }, [totalPages]);

  const loadUsers = useCallback(
    async ({ showFullLoader = false, preservePage = false } = {}) => {
      setError(null);
      if (showFullLoader) {
        setLoading(true);
        setAllUsers([]);
        setCurrentPage(0);
      } else {
        setRefreshing(true);
      }
      try {
        const aggregated = [];
        let token;
        do {
          const response = await fetchUsers({
            pageToken: token,
            query: search,
          });
          aggregated.push(...response.users);
          token = response.nextPageToken || null;
        } while (token);

        aggregated.sort((a, b) => {
          const aCreated = new Date(a.createdAt || 0).getTime();
          const bCreated = new Date(b.createdAt || 0).getTime();
          if (Number.isNaN(aCreated) && Number.isNaN(bCreated)) return 0;
          if (Number.isNaN(aCreated)) return 1;
          if (Number.isNaN(bCreated)) return -1;
          return bCreated - aCreated;
        });
        setAllUsers(aggregated);
        setCurrentPage((prev) => {
          if (preservePage) {
            if (aggregated.length === 0) return 0;
            const nextTotal = Math.ceil(aggregated.length / PAGE_SIZE);
            return Math.min(prev, nextTotal - 1);
          }
          return 0;
        });
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    return () => {
      if (subscriptionCopyTimeoutRef.current) {
        clearTimeout(subscriptionCopyTimeoutRef.current);
      }
      if (customerCopyTimeoutRef.current) {
        clearTimeout(customerCopyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadUsers({ showFullLoader: true }).catch(() => {});
  }, [loadUsers]);

  const handleUserAction = useCallback(
    async (uid, payload) => {
      if (!uid || !payload?.action) return;
      const { action, ...rest } = payload;

      if (action === 'delete_account') {
        const confirmed =
          typeof window === 'undefined' ? false : window.confirm('Delete this account permanently?');
        if (!confirmed) {
          return;
        }
      }

      try {
        setActionBusyUid(uid);
        setError(null);

        let res;
        if (action === 'delete_account') {
          res = await fetch('/api/admin/users/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid }),
          });
        } else {
          res = await fetch('/api/admin/users/set-entitlements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, action, ...rest }),
          });
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const defaultMessage =
            action === 'delete_account' ? 'Failed to delete user' : 'Failed to update entitlements';
          throw new Error(data?.error || defaultMessage);
        }

        await loadUsers({ preservePage: true });
      } catch (err) {
        console.error(err);
        const fallback =
          action === 'delete_account' ? 'Failed to delete user' : 'Failed to update entitlements';
        setError(err instanceof Error ? err : new Error(fallback));
      } finally {
        setActionBusyUid(null);
      }
    },
    [loadUsers]
  );

  const handleSearchSubmit = useCallback(
    (event) => {
      event.preventDefault();
      setCurrentPage(0);
      setSearch(searchInput.trim());
    },
    [searchInput]
  );

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => {
      if (totalPages === 0) return 0;
      return Math.min(prev + 1, totalPages - 1);
    });
  }, [totalPages]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setCurrentPage(0);
  }, []);

  const proCount = useMemo(() => allUsers.filter((user) => user.tier === 'pro').length, [allUsers]);
  const trialCount = useMemo(() => allUsers.filter((user) => user.tier === 'trial').length, [allUsers]);

  return (
    <div className="min-h-screen bg-[#30333a] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="rounded-full border border-white/10 p-2 hover:bg-white/10"
            >
              <ArrowLeftIcon className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Manage Subscriptions</h1>
              <p className="text-sm text-gray-400">
                Search users, review plan details, and jump into Stripe for billing actions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span className="rounded-full bg-white/10 px-3 py-1">
              Total users: <strong className="text-white">{allUsers.length}</strong>
            </span>
            <span className="rounded-full bg-[#25edda]/10 px-3 py-1 text-[#25edda]">
              Pro: <strong>{proCount}</strong>
            </span>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-200">
              Trials: <strong>{trialCount}</strong>
            </span>
          </div>
        </header>

        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full flex-col gap-3 rounded-3xl sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email or name"
              className="h-12 w-full rounded-full bg-[#30333a] shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b] pl-12 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25edda]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-12 rounded-full bg-[#25edda] px-6 text-sm font-semibold text-[#1f2126] transition-colors duration-200 hover:bg-[#23d9c8]"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="h-12 rounded-full border border-white/10 px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
            >
              Clear
            </button>
          </div>
          <button
            type="button"
            onClick={() => loadUsers({ preservePage: true })}
            disabled={refreshing || loading}
            className="flex h-12 items-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold text-gray-300 transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${(refreshing || loading) ? 'animate-spin text-white' : 'text-gray-300'}`}
            />
            Refresh
          </button>
        </form>

        {totalPages > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={allUsers.length}
            pageSize={PAGE_SIZE}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
            disablePrev={currentPage === 0}
            disableNext={totalPages === 0 || currentPage >= totalPages - 1}
          />
        )}

        <section className="overflow-hidden rounded-3xl shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last activity</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Stripe</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-gray-100">
                {loading && allUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      Loading subscription data…
                    </td>
                  </tr>
                ) : allUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((user) => (
                    <tr key={user.uid}>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">
                            {user.displayName || 'Unnamed'}
                          </span>
                          <span className="text-xs text-gray-400">{user.email || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span>{user.plan || 'Free'}</span>
                          {user.stripeSubscriptionId && (
                            <button
                              type="button"
                              onClick={() => handleSubscriptionCopy(user.stripeSubscriptionId)}
                              className={`text-left text-xs font-semibold transition-colors ${
                                copiedSubscriptionId === user.stripeSubscriptionId
                                  ? 'text-emerald-300'
                                  : 'text-[#25edda] hover:text-[#23d9c8]'
                              }`}
                              aria-label="Copy subscription ID"
                            >
                              {copiedSubscriptionId === user.stripeSubscriptionId ? 'Copied!' : 'Copy Sub ID'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <TierBadge tier={user.tier} />
                      </td>
                      <td className="px-4 py-4">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-4 text-xs text-gray-300">
                        <div className="flex flex-col gap-1">
                          <span>{formatDate(user.lastActivityAt || user.lastSignInTime)}</span>
                          {user.lastActivityType && (
                            <span className="w-fit rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                              {user.lastActivityType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-300">
                        <div className="flex flex-col gap-1">
                          <span>{formatLocation(user.lastActivityLocation)}</span>
                          {user.lastActivityLocation?.timezone && (
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">
                              {user.lastActivityLocation.timezone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2 text-xs">
                          {user.stripeCustomerId ? (
                            <>
                              <Link
                                href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                                target="_blank"
                                className="font-semibold text-[#25edda] hover:text-[#23d9c8]"
                              >
                                Open customer
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleCustomerCopy(user.stripeCustomerId)}
                                className={`text-left font-medium transition-colors ${
                                  copiedCustomerId === user.stripeCustomerId
                                    ? 'text-emerald-300'
                                    : 'text-gray-300 hover:text-white'
                                }`}
                              >
                                {copiedCustomerId === user.stripeCustomerId ? 'Copied!' : 'Copy Cus ID'}
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-500">No Stripe record</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <RowActions
                          busy={actionBusyUid === user.uid}
                          onAction={(payload) => handleUserAction(user.uid, payload)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 0 && (
            <div className="border-t border-white/10 px-4 py-3">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={allUsers.length}
                pageSize={PAGE_SIZE}
                onPrev={handlePrevPage}
                onNext={handleNextPage}
                disablePrev={currentPage === 0}
                disableNext={totalPages === 0 || currentPage >= totalPages - 1}
              />
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            <p>{error?.message || 'Something went wrong while loading users.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
