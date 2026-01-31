'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, MagnifyingGlassIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CITY_OPTIONS = [
  { value: '', label: 'All cities' },
  { value: 'new-york', label: 'New York' },
  { value: 'buenos-aires', label: 'Buenos Aires' },
  { value: 'san-francisco', label: 'San Francisco' },
  { value: 'berlin', label: 'Berlin' },
  { value: 'sao-paulo', label: 'Sao Paulo' },
  { value: 'athens', label: 'Athens' },
  { value: 'turkiye', label: 'Turkiye' },
  { value: 'england', label: 'England' },
  { value: 'miami', label: 'Miami' },
  { value: 'paris', label: 'Paris' },
  { value: 'rome', label: 'Rome' },
  { value: 'austin', label: 'Austin' },
  { value: 'barcelona', label: 'Barcelona' },
];

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
  title: event.title || '',
  venue: event.venue || '',
  address: event.address || '',
  date: event.date || '',
  startTime: minutesToTime(event.startTimeMinutes),
  endTime: minutesToTime(event.endTimeMinutes),
  eventType: event.eventType || 'milonga',
  citySlug: event.citySlug || '',
  city: event.city || '',
  sourceUrl: event.sourceUrl || '',
  imageUrl: event.imageUrl || '',
  descriptionRaw: event.descriptionRaw || '',
  stableKey: event.stableKey || '',
});

export default function ManageMilongasPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [bulkStatus, setBulkStatus] = useState('');
  const router = useRouter();

  const fetchEvents = async (citySlug = '') => {
    setIsLoading(true);
    setError('');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/milongas/manage${
        citySlug ? `?citySlug=${citySlug}` : ''
      }`;
      const response = await fetch(apiUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch milongas.');
      const data = await response.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch milongas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    if (!search) return events;
    const query = search.toLowerCase();
    return events.filter((event) => {
      return (
        (event.title || '').toLowerCase().includes(query) ||
        (event.venue || '').toLowerCase().includes(query) ||
        (event.address || '').toLowerCase().includes(query)
      );
    });
  }, [events, search]);

  const groupedEvents = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((event) => {
      const key = event.stableKey || event.id;
      if (!map.has(key)) {
        map.set(key, { ...event, occurrences: [event] });
        return;
      }
      map.get(key).occurrences.push(event);
    });
    return Array.from(map.values()).map((entry) => {
      const sorted = entry.occurrences
        .slice()
        .sort((a, b) => {
          if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
          const aStart = a.startTimeMinutes ?? 9999;
          const bStart = b.startTimeMinutes ?? 9999;
          return aStart - bStart;
        });
      return {
        ...entry,
        ...sorted[0],
        occurrences: sorted,
      };
    });
  }, [filteredEvents]);

  const sortedEvents = useMemo(() => {
    return [...groupedEvents].sort((a, b) => {
      const cityA = (a.city || a.citySlug || '').toLowerCase();
      const cityB = (b.city || b.citySlug || '').toLowerCase();
      if (cityA !== cityB) return cityA.localeCompare(cityB);
      if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
      const aStart = a.startTimeMinutes ?? 9999;
      const bStart = b.startTimeMinutes ?? 9999;
      return aStart - bStart;
    });
  }, [groupedEvents]);

  const totalMilongas = sortedEvents.length;
  const totalCities = new Set(
    sortedEvents.map((event) => event.city || event.citySlug).filter(Boolean)
  ).size;

  const handleSave = async (id, updates) => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/milongas/manage`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id,
          updates: {
            title: updates.title,
            venue: updates.venue,
            address: updates.address,
            date: updates.date,
            startTimeMinutes: updates.startTimeMinutes,
            endTimeMinutes: updates.endTimeMinutes,
            eventType: updates.eventType,
            citySlug: updates.citySlug,
            city: updates.city,
            sourceUrl: updates.sourceUrl,
            imageUrl: updates.imageUrl,
            descriptionRaw: updates.descriptionRaw,
            latitude: updates.latitude,
            longitude: updates.longitude,
          },
          stableKey: updates.stableKey,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save changes.');
      }
      setEvents((prev) =>
        prev.map((event) => (event.id === id ? { ...event, ...updates } : event))
      );
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    }
  };

  const handleBulkGeocode = async () => {
    setBulkStatus('Running geocode...');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/milongas/manage`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'bulk-geocode' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to geocode locations.');
      setBulkStatus(`Geocoded ${data.geocoded} events (skipped ${data.skipped}).`);
    } catch (err) {
      setBulkStatus(err.message || 'Bulk geocode failed.');
    }
  };

  const startEdit = (event) => {
    setEditingId(event.id);
    setDraft(buildDraft(event));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  return (
    <div className="min-h-screen bg-[#30333a] text-white p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <ArrowLeftIcon className="h-6 w-6 text-white" />
            </button>
            <h1 className="text-3xl font-bold text-white">Manage Milongas</h1>
          </div>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, venue, or address"
              className="w-full rounded-full border border-white/10 bg-[#2a2d33] py-2 pl-9 pr-4 text-sm text-white"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => {
              const value = e.target.value;
              setCityFilter(value);
              fetchEvents(value);
            }}
            className="rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2 text-sm text-white"
          >
            {CITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#2a2d33] text-white">
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkGeocode}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-gray-200 hover:border-white/30"
          >
            Geocode missing locations
          </button>
        </div>

        {bulkStatus && <p className="text-xs text-gray-400">{bulkStatus}</p>}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {isLoading && <p className="text-gray-300">Loading milongas...</p>}

        {!isLoading && !error && filteredEvents.length === 0 && (
          <p className="text-gray-300">No milongas found for the next 4 weeks.</p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-gray-300">
          <span className="rounded-full border border-white/10 px-3 py-1">
            {totalMilongas} milongas
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            {totalCities} cities
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#2a2d33] text-gray-300">
              <tr>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedEvents.map((event) => {
                const isEditing = editingId === event.id;
                return (
                  <tr key={event.id} className="bg-[#30333a]">
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.city || ''}
                          onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        event.city || event.citySlug
                      )}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {isEditing ? (
                        <input
                          value={draft.title || ''}
                          onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        event.title
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.venue || ''}
                          onChange={(e) => setDraft((prev) => ({ ...prev, venue: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        event.venue || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.address || ''}
                          onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        event.address || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.startTime || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, startTime: e.target.value }))
                          }
                          className="w-24 rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        minutesToTime(event.startTimeMinutes) || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.endTime || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, endTime: e.target.value }))
                          }
                          className="w-24 rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        minutesToTime(event.endTimeMinutes) || '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() =>
                                handleSave(event.id, {
                                  title: draft.title,
                                  venue: draft.venue,
                                  address: draft.address,
                                  date: draft.date,
                                  startTimeMinutes: timeToMinutes(draft.startTime),
                                  endTimeMinutes: timeToMinutes(draft.endTime),
                                  eventType: draft.eventType,
                                  citySlug: draft.citySlug,
                                  city: draft.city,
                                  sourceUrl: draft.sourceUrl,
                                  imageUrl: draft.imageUrl,
                                  descriptionRaw: draft.descriptionRaw,
                                  stableKey: draft.stableKey,
                                })
                              }
                              className="rounded-full bg-[#25edda] px-3 py-1 text-xs font-semibold text-[#1f2126]"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(event)}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 hover:border-white/30"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
