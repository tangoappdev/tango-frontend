'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

const typeOptions = ['milonga', 'practica', 'class', 'workshop', 'other'];

const minutesToTime = (minutes) => {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) return '';
  const hrs24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const meridiem = hrs24 >= 12 ? 'pm' : 'am';
  const hrs12 = hrs24 % 12 || 12;
  return `${hrs12}:${mins.toString().padStart(2, '0')} ${meridiem}`;
};

const timeToMinutes = (value) => {
  if (!value) return null;
  const match = value.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = (match[3] || '').toLowerCase();
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const buildDraft = (event) => ({
  title: event?.title || '',
  venue: event?.venue || '',
  address: event?.address || '',
  startTime: minutesToTime(event?.startTimeMinutes),
  endTime: minutesToTime(event?.endTimeMinutes),
  eventType: event?.eventType || 'milonga',
  city: event?.city || '',
  citySlug: event?.citySlug || '',
  sourceUrl: event?.sourceUrl || '',
  imageUrl: event?.imageUrl || '',
  signedImageUrl: '',
  descriptionRaw: event?.descriptionRaw || '',
  stableKey: event?.stableKey || '',
});

export default function MilongaQuickEditModal({ open, event, onClose, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(buildDraft(event));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(buildDraft(event));
      setError('');
      setUploadStatus('');
    }
  }, [open, event]);

  if (!open || !event) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/milongas/manage`;
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: event.id,
        updates: {
          title: draft.title,
          venue: draft.venue,
          address: draft.address,
          startTimeMinutes: timeToMinutes(draft.startTime),
          endTimeMinutes: timeToMinutes(draft.endTime),
          eventType: draft.eventType,
          city: draft.city,
          citySlug: draft.citySlug,
          sourceUrl: draft.sourceUrl,
          imageUrl: draft.imageUrl,
          signedImageUrl: draft.signedImageUrl,
          descriptionRaw: draft.descriptionRaw,
        },
        stableKey: event.stableKey,
      }),
    });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save changes.');
      }
      onSaved?.({
        ...event,
        ...draft,
        startTimeMinutes: timeToMinutes(draft.startTime),
        endTimeMinutes: timeToMinutes(draft.endTime),
        imageUrl: data?.imageUrl || draft.imageUrl,
      });
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this event?');
    if (!confirmed) return;
    setSaving(true);
    setError('');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/milongas/manage`;
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: event.id, stableKey: event.stableKey }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete event.');
      }
      onDeleted?.(event);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to delete event.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadStatus('Uploading image...');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/milongas/upload-image`;
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
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#2a2d33] p-6 text-white shadow-xl"
        onPaste={(event) => {
          const items = Array.from(event.clipboardData?.files || []);
          const imageFile = items.find((file) => file.type.startsWith('image/'));
          if (imageFile) {
            event.preventDefault();
            handleFileUpload(imageFile);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit milonga</h2>
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
            <label className="text-xs text-gray-400">Venue</label>
            <input
              value={draft.venue}
              onChange={(e) => setDraft((prev) => ({ ...prev, venue: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Address</label>
            <input
              value={draft.address}
              onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Start time</label>
            <input
              value={draft.startTime}
              onChange={(e) => setDraft((prev) => ({ ...prev, startTime: e.target.value }))}
              placeholder="7:30 pm"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">End time</label>
            <input
              value={draft.endTime}
              onChange={(e) => setDraft((prev) => ({ ...prev, endTime: e.target.value }))}
              placeholder="11:00 pm"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Event type</label>
            <select
              value={draft.eventType}
              onChange={(e) => setDraft((prev) => ({ ...prev, eventType: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            >
              {typeOptions.map((option) => (
                <option key={option} value={option} className="bg-[#30333a] text-white">
                  {option}
                </option>
              ))}
            </select>
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
            <label className="text-xs text-gray-400">City slug</label>
            <input
              value={draft.citySlug}
              onChange={(e) => setDraft((prev) => ({ ...prev, citySlug: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Source URL</label>
            <input
              value={draft.sourceUrl}
              onChange={(e) => setDraft((prev) => ({ ...prev, sourceUrl: e.target.value }))}
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
            <p className="mt-2 text-[11px] text-gray-400">
              Tip: paste a screenshot here to upload instantly.
            </p>
            {uploadStatus && <p className="mt-2 text-xs text-gray-400">{uploadStatus}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Description</label>
            <textarea
              value={draft.descriptionRaw}
              onChange={(e) => setDraft((prev) => ({ ...prev, descriptionRaw: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300 hover:border-red-400"
          >
            <TrashIcon className="h-4 w-4" />
            Delete event
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
