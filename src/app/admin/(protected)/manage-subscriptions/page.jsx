'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 50;

function StatusBadge({ status }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const tone =
    status === 'active' || status === 'trialing'
      ? 'bg-emerald-500/15 text-emerald-200'
      : status === 'past_due'
      ? 'bg-amber-500/15 text-amber-200'
      : 'bg-rose-500/20 text-rose-200';
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}

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

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: undefined,
  }).format(date);
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

export default function ManageSubscriptionsPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageToken, setPageToken] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(
    async ({ reset = false } = {}) => {
      try {
        if (reset) {
          setLoading(true);
          setUsers([]);
          setPageToken(null);
        } else {
          setRefreshing(true);
        }
        const response = await fetchUsers({
          pageToken: reset ? undefined : pageToken,
          query: search,
        });
        setUsers((prev) => (reset ? response.users : [...prev, ...response.users]));
        setNextPageToken(response.nextPageToken || null);
        if (reset) {
          setPageToken(undefined);
        }
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pageToken, search]
  );

  useEffect(() => {
    loadUsers({ reset: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearchSubmit = useCallback(
    (event) => {
      event.preventDefault();
      setSearch(searchInput.trim());
    },
    [searchInput]
  );

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken) return;
    setPageToken(nextPageToken);
    try {
      const response = await fetchUsers({ pageToken: nextPageToken, query: search });
      setUsers((prev) => [...prev, ...response.users]);
      setNextPageToken(response.nextPageToken || null);
    } catch (err) {
      console.error(err);
      setError(err);
    }
  }, [nextPageToken, search]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearch('');
  }, []);

  const proCount = useMemo(() => users.filter((user) => user.tier === 'pro').length, [users]);
  const trialCount = useMemo(() => users.filter((user) => user.tier === 'trial').length, [users]);

  return (
    <div className="min-h-screen bg-[#30333a] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
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
              Total users: <strong className="text-white">{users.length}</strong>
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
          className="flex w-full flex-col gap-3 rounded-3xl border border-white/10 bg-[#30333a] p-4 shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b] sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email or name"
              className="h-12 w-full rounded-full bg-black/20 pl-12 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25edda]"
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
            onClick={() => loadUsers({ reset: true })}
            disabled={refreshing}
            className="flex h-12 items-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold text-gray-300 transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${refreshing ? 'animate-spin text-white' : 'text-gray-300'}`}
            />
            Refresh
          </button>
        </form>

        <section className="overflow-hidden rounded-3xl border border-white/10 shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Trial ends</th>
                  <th className="px-4 py-3">Last sign-in</th>
                  <th className="px-4 py-3">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-gray-100">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      Loading subscription data…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
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
                            <span className="text-xs text-gray-500">
                              {user.stripeSubscriptionId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <TierBadge tier={user.tier} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-4">{formatDate(user.trialEndsAt)}</td>
                      <td className="px-4 py-4 text-xs text-gray-300">
                        {formatDate(user.lastSignInTime)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-3 text-xs">
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
                                onClick={() => navigator.clipboard.writeText(user.stripeCustomerId)}
                                className="text-left font-medium text-gray-300 hover:text-white"
                              >
                                Copy customer ID
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-500">No Stripe record</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {nextPageToken && (
            <div className="border-t border-white/10 bg-white/5 px-4 py-3 text-center">
              <button
                onClick={handleLoadMore}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/20"
              >
                Load more
              </button>
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
