'use client';

// ANCHOR: ADMIN_USERS_PAGE_TOP
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

// ANCHOR: ADMIN_USERS_PAGE_UTILS
function clsx(...xs){ return xs.filter(Boolean).join(' '); }
function fmt(iso){
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
function initials(name='', email=''){
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0,2);
    return parts.map(p=>p[0]?.toUpperCase()).join('');
  }
  return (email?.[0] || '?').toUpperCase();
}

// ANCHOR: ROW_ACTIONS_COMPONENT
function RowActions({ uid, onAction, busy }) {
  const [open, setOpen] = useState(false);

  const item = (label, action, opts={}) => (
    <button
      key={label}
      disabled={busy}
      onClick={() => { setOpen(false); onAction({ action, ...opts }); }}
      className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
    >
      {label}
    </button>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v=>!v)}
        className="px-2 py-1 rounded-lg border border-white/10 hover:border-white/20 text-sm flex items-center gap-1"
      >
        Actions <ChevronDownIcon className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-[#3e424b] rounded-lg shadow-lg border border-white/10 z-10">
          <div className="py-1">
            {item('Grant Pro 30 days','grant_pro_days',{ days:30 })}
            {item('Grant Pro 90 days','grant_pro_days',{ days:90 })}
            {item('Set Pro (permanent)','set_pro_permanent')}
            <div className="h-px bg-white/10 my-1" />
            {item('Add 7 days Trial','set_trial_days',{ days:7 })}
            <div className="h-px bg-white/10 my-1" />
            {item('Clear Manual Override','clear_manual')}
          </div>
        </div>
      )}
    </div>
  );
}

// ANCHOR: MAIN_PAGE_COMPONENT
export default function AdminUsersPage() {
  // ANCHOR: STATE_VARS
  const [users, setUsers] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyUid, setBusyUid] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const pageSize = 50;

  // ANCHOR: FETCH_FN
  const fetchUsers = async ({ reset=false } = {}) => {
    try {
      setLoading(true);
      setError('');
      const url = new URL('/api/admin/users/list', window.location.origin);
      url.searchParams.set('pageSize', String(pageSize));
      if (!reset && nextPageToken) url.searchParams.set('pageToken', nextPageToken);
      if (appliedQ) url.searchParams.set('q', appliedQ);

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setError('Forbidden: admin access required. Sign in with an admin account.');
        setUsers([]);
        setNextPageToken(null);
        return;
      }
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();

      setUsers(prev => reset ? data.users : [...prev, ...data.users]);
      setNextPageToken(data.nextPageToken || null);
    } catch (e) {
      console.error(e);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  // ANCHOR: INITIAL_LOAD
  useEffect(() => {
    // first load
    fetchUsers({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQ]);

  // ANCHOR: ACTION_CALLER
  const runAction = async (uid, payload) => {
    try {
      setBusyUid(uid);
      setError('');
      const res = await fetch('/api/admin/users/set-entitlements', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ uid, ...payload }),
      });
      if (res.status === 401 || res.status === 403) {
        setError('Forbidden: admin access required.');
        return;
      }
      if (!res.ok) throw new Error('Action failed');
      // Refresh current list from start to reflect changes
      await fetchUsers({ reset: true });
    } catch (e) {
      console.error(e);
      setError('Could not apply action.');
    } finally {
      setBusyUid(null);
    }
  };

  // ANCHOR: RENDER
  return (
    <div className="min-h-screen bg-[#30333a] text-white px-4 py-6">
      {/* ANCHOR: HEADER_BAR */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Admin · Users</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter') { setAppliedQ(q); setNextPageToken(null); } }}
              placeholder="Search name or email…"
              className="pl-8 pr-3 py-2 rounded-full bg-[#3e424b] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#25edda]"
            />
          </div>
          <button
            onClick={() => { setAppliedQ(q); setNextPageToken(null); }}
            className="px-3 py-2 rounded-full border border-[#25edda] text-[#25edda] hover:bg-[#25edda] hover:text-[#30333a]"
          >
            Search
          </button>
          <button
            onClick={() => fetchUsers({ reset:true })}
            className="ml-1 px-3 py-2 rounded-full border border-white/10 hover:border-white/20 flex items-center gap-1"
            title="Refresh"
          >
            <ArrowPathIcon className={clsx('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ANCHOR: ERROR_STRIP */}
      {error && (
        <div className="max-w-6xl mx-auto mb-4 p-3 rounded-lg bg-red-900/40 border border-red-500/30">
          {error}
        </div>
      )}

      {/* ANCHOR: TABLE */}
      <div className="max-w-6xl mx-auto bg-[#3e424b] rounded-2xl p-3 shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-300">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>User</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Plan / Status</th>
                <th>Trial Ends</th>
                <th>Created</th>
                <th>Last Sign-in</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map(u => (
                <tr key={u.uid} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="flex items-center gap-2">
                    {u.photoURL ? (
                      <Image src={u.photoURL} alt="" width={32} height={32} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#30333a] flex items-center justify-center">
                        <span className="text-xs text-gray-300">{initials(u.displayName, u.email)}</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{u.displayName || '—'}</span>
                      {u.manual?.tier === 'pro' && (
                        <span className="text-[11px] text-yellow-300">
                          Manual Pro{u.manual?.until ? ` until ${fmt(u.manual.until)}` : ' (permanent)'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-gray-200">{u.email || '—'}</td>
                  <td>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-xs',
                      u.tier === 'pro' && 'bg-emerald-500/20 text-emerald-300',
                      u.tier === 'trial' && 'bg-yellow-500/20 text-yellow-300',
                      u.tier === 'free' && 'bg-gray-500/20 text-gray-300'
                    )}>
                      {u.tier || '—'}
                    </span>
                  </td>
                  <td className="text-gray-200">{u.plan || '—'}{u.status ? ` / ${u.status}` : ''}</td>
                  <td className="text-gray-300">{fmt(u.trialEndsAt)}</td>
                  <td className="text-gray-300">{fmt(u.createdAt)}</td>
                  <td className="text-gray-300">{fmt(u.lastSignInTime)}</td>
                  <td className="text-right">
                    <RowActions
                      uid={u.uid}
                      busy={busyUid === u.uid}
                      onAction={payload => runAction(u.uid, payload)}
                    />
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ANCHOR: PAGINATION_BAR */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Showing {users.length} {appliedQ ? `for “${appliedQ}”` : ''}.
          </div>
          <div className="flex items-center gap-2">
            {nextPageToken && (
              <button
                disabled={loading}
                onClick={() => fetchUsers({ reset:false })}
                className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 disabled:opacity-50"
              >
                Load more
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
