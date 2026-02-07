'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PendingFestivalsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState(null);

  const loadSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/pending-submissions?type=festival', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load submissions');
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err?.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleAction = async (id, action) => {
    if (!id) return;
    setWorkingId(id);
    try {
      const res = await fetch('/api/admin/pending-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update submission');
      await loadSubmissions();
    } catch (err) {
      setError(err?.message || 'Failed to update submission');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#30333a] text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#25edda]/80">Admin</p>
            <h1 className="text-3xl font-semibold text-white">Pending Festivals</h1>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
          >
            Back to dashboard
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#2a2d33] p-6 text-gray-300">
            Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#2a2d33] p-6 text-gray-300">
            No pending festivals.
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((item) => {
              const payload = item.payload || {};
              const location = [payload.city, payload.country].filter(Boolean).join(', ');
              const dateLabel =
                payload.startDate && payload.endDate && payload.endDate !== payload.startDate
                  ? `${payload.startDate} - ${payload.endDate}`
                  : payload.startDate || payload.dateText || 'Date TBD';
              return (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-[#2a2d33] p-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-gray-200">
                      {dateLabel}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{payload.title || 'Untitled'}</h2>
                  {location && (
                    <p className="mt-1 text-sm text-gray-300">{location}</p>
                  )}
                  {payload.description && (
                    <p className="mt-3 text-sm text-gray-300 whitespace-pre-line">
                      {payload.description}
                    </p>
                  )}
                  {payload.website && (
                    <a
                      href={payload.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                    >
                      Visit website
                    </a>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleAction(item.id, 'approve')}
                      disabled={workingId === item.id}
                      className="rounded-full bg-[#25edda] px-4 py-2 text-xs font-semibold text-[#1f232b] disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'deny')}
                      disabled={workingId === item.id}
                      className="rounded-full border border-rose-400/60 px-4 py-2 text-xs font-semibold text-rose-200 disabled:opacity-60"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
