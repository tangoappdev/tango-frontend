'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

const buildDraft = (festival) => ({
  title: festival?.title || '',
  city: festival?.city || '',
  country: festival?.country || '',
  startDate: festival?.startDate || '',
  endDate: festival?.endDate || '',
  dateText: festival?.dateText || '',
  website: festival?.website || '',
  imageUrl: festival?.imageUrl || '',
  signedImageUrl: '',
  topPick: Boolean(festival?.topPick),
});

export default function FestivalQuickEditModal({ open, festival, onClose, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(buildDraft(festival));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(buildDraft(festival));
      setError('');
      setUploadStatus('');
    }
  }, [open, festival]);

  if (!open || !festival) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/manage`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: festival.id,
          updates: {
            title: draft.title,
            city: draft.city,
            country: draft.country,
            startDate: draft.startDate,
            endDate: draft.endDate,
            dateText: draft.dateText,
            website: draft.website,
            imageUrl: draft.imageUrl,
            signedImageUrl: draft.signedImageUrl,
            topPick: Boolean(draft.topPick),
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save changes.');
      }
      onSaved?.({ ...festival, ...draft, imageUrl: data?.imageUrl || draft.imageUrl });
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this festival?');
    if (!confirmed) return;
    setSaving(true);
    setError('');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/manage`;
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: festival.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete festival.');
      }
      onDeleted?.(festival);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to delete festival.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadStatus('Uploading image...');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/upload-image`;
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload image.');
      setDraft((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      setUploadStatus('Image uploaded.');
    } catch (err) {
      setUploadStatus(err.message || 'Failed to upload image.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#2a2d33] p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit festival</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-gray-300 hover:border-white/30"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">City</label>
            <input
              value={draft.city}
              onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Country</label>
            <input
              value={draft.country}
              onChange={(e) => setDraft((prev) => ({ ...prev, country: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Start date</label>
            <input
              value={draft.startDate}
              onChange={(e) => setDraft((prev) => ({ ...prev, startDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">End date</label>
            <input
              value={draft.endDate}
              onChange={(e) => setDraft((prev) => ({ ...prev, endDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Date text</label>
            <input
              value={draft.dateText}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateText: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Website</label>
            <input
              value={draft.website}
              onChange={(e) => setDraft((prev) => ({ ...prev, website: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Image URL</label>
            <input
              value={draft.imageUrl}
              onChange={(e) => setDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs text-gray-400">Signed image URL (optional)</label>
            <input
              value={draft.signedImageUrl}
              onChange={(e) => setDraft((prev) => ({ ...prev, signedImageUrl: e.target.value }))}
              placeholder="Paste signed URL to copy into storage"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
            <label className="mt-2 block text-xs text-gray-300">
              Upload file
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </label>
            {uploadStatus && <p className="mt-2 text-xs text-gray-400">{uploadStatus}</p>}
          </div>
          <label className="flex items-center gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={Boolean(draft.topPick)}
              onChange={(e) => setDraft((prev) => ({ ...prev, topPick: e.target.checked }))}
              className="h-4 w-4 accent-[#25edda]"
            />
            Top pick
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300 hover:border-red-400"
          >
            <TrashIcon className="h-4 w-4" />
            Delete festival
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-[#25edda] px-4 py-2 text-xs font-semibold text-[#1f2126] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
