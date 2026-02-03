'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const formatDate = (value) => (value ? value : '');

export default function ManageFestivalsPage() {
  const [festivals, setFestivals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [uploadStatus, setUploadStatus] = useState('');
  const [sortField, setSortField] = useState('country');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    title: '',
    city: '',
    country: '',
    startDate: '',
    endDate: '',
    dateText: '',
    website: '',
    imageUrl: '',
    latitude: '',
    longitude: '',
    topPick: false,
  });
  const [createStatus, setCreateStatus] = useState('');
  const router = useRouter();

  const fetchFestivals = async () => {
    setIsLoading(true);
    setError('');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/manage`;
      const response = await fetch(apiUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch festivals.');
      const data = await response.json();
      const list = Array.isArray(data.festivals) ? data.festivals : [];
      setFestivals(list);
      return list;
    } catch (err) {
      setError(err.message || 'Failed to fetch festivals.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFestivals();
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    const results = festivals.filter((festival) => {
      if (!query) return true;
      return (
        (festival.title || '').toLowerCase().includes(query) ||
        (festival.city || '').toLowerCase().includes(query) ||
        (festival.country || '').toLowerCase().includes(query)
      );
    });
    const compareValues = (left, right) => (left || '').localeCompare(right || '');
    const sorted = results.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'startDate':
          comparison = compareValues(a.startDate, b.startDate);
          break;
        case 'country':
          comparison = compareValues(a.country, b.country);
          if (comparison === 0) comparison = compareValues(a.city, b.city);
          if (comparison === 0) comparison = compareValues(a.title, b.title);
          break;
        case 'city':
          comparison = compareValues(a.city, b.city);
          if (comparison === 0) comparison = compareValues(a.country, b.country);
          if (comparison === 0) comparison = compareValues(a.title, b.title);
          break;
        case 'title':
          comparison = compareValues(a.title, b.title);
          if (comparison === 0) comparison = compareValues(a.city, b.city);
          if (comparison === 0) comparison = compareValues(a.country, b.country);
          break;
        default:
          comparison = compareValues(a.country, b.country);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [festivals, search, sortField, sortDirection]);

  const startEdit = (festival) => {
    setEditingId(festival.id);
    setDraft({
      title: festival.title || '',
      city: festival.city || '',
      country: festival.country || '',
      startDate: festival.startDate || '',
      endDate: festival.endDate || '',
      dateText: festival.dateText || '',
      website: festival.website || '',
      imageUrl: festival.imageUrl || '',
      topPick: Boolean(festival.topPick),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
    setUploadStatus('');
  };

  const handleSave = async (id) => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/manage`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id,
          updates: {
            title: draft.title,
            city: draft.city,
            country: draft.country,
            startDate: draft.startDate,
            endDate: draft.endDate,
            dateText: draft.dateText,
            website: draft.website,
            imageUrl: draft.imageUrl,
            topPick: Boolean(draft.topPick),
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to save changes.');
      setFestivals((prev) =>
        prev.map((festival) =>
          festival.id === id ? { ...festival, ...draft } : festival
        )
      );
      setEditingId(null);
      setUploadStatus('');
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    }
  };

  const clearAllOverrides = async (id) => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/manage`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id,
          deleteFields: [
            'title',
            'city',
            'country',
            'startDate',
            'endDate',
            'dateText',
            'website',
            'imageUrl',
            'latitude',
            'longitude',
            'topPick',
          ],
        }),
      });
      if (!response.ok) throw new Error('Failed to clear overrides.');
      const updated = await fetchFestivals();
      const refreshed = updated.find((festival) => festival.id === id);
      if (refreshed && editingId === id) {
        setDraft({
          title: refreshed.title || '',
          city: refreshed.city || '',
          country: refreshed.country || '',
          startDate: refreshed.startDate || '',
          endDate: refreshed.endDate || '',
          dateText: refreshed.dateText || '',
          website: refreshed.website || '',
          imageUrl: refreshed.imageUrl || '',
          topPick: Boolean(refreshed.topPick),
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to clear overrides.');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this festival?');
    if (!confirmed) return;
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/manage`;
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to delete festival.');
      setFestivals((prev) => prev.filter((festival) => festival.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete festival.');
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

  const handleCreateFestival = async () => {
    setCreateStatus('');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/manage`;
      const payload = {
        title: createDraft.title.trim(),
        city: createDraft.city.trim(),
        country: createDraft.country.trim(),
        startDate: createDraft.startDate.trim(),
        endDate: createDraft.endDate.trim(),
        dateText: createDraft.dateText.trim(),
        website: createDraft.website.trim(),
        imageUrl: createDraft.imageUrl.trim(),
        latitude: createDraft.latitude === '' ? null : Number(createDraft.latitude),
        longitude: createDraft.longitude === '' ? null : Number(createDraft.longitude),
        topPick: Boolean(createDraft.topPick),
      };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create festival.');
      }
      await fetchFestivals();
      setShowCreateModal(false);
    setCreateDraft({
      title: '',
      city: '',
      country: '',
      startDate: '',
      endDate: '',
      dateText: '',
      website: '',
      imageUrl: '',
      latitude: '',
      longitude: '',
      topPick: false,
    });
    } catch (err) {
      setCreateStatus(err.message || 'Failed to create festival.');
    }
  };

  const handleReGeocode = async (id) => {
    setError('');
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/festivals/manage`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id,
          updates: {
            city: draft.city,
            country: draft.country,
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to re-geocode.');
      await fetchFestivals();
    } catch (err) {
      setError(err.message || 'Failed to re-geocode.');
    }
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
            <h1 className="text-3xl font-bold text-white">Manage Festivals</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-full bg-[#25edda] px-4 py-2 text-sm font-semibold text-[#1f2126]"
          >
            + New Festival
          </button>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, city, or country"
              className="w-full rounded-full border border-white/10 bg-[#2a2d33] py-2 pl-9 pr-4 text-sm text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span>Sort by</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="rounded-full border border-white/10 bg-[#2a2d33] px-3 py-2 text-xs text-white"
              >
                <option value="startDate">Start date</option>
                <option value="country">Country</option>
                <option value="city">City</option>
                <option value="title">Name</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() =>
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
              }
              className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-300 hover:border-white/30"
            >
              {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
        </div>

        {uploadStatus && <p className="text-xs text-gray-400">{uploadStatus}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {isLoading && <p className="text-gray-300">Loading festivals...</p>}

        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-gray-300">No festivals found.</p>
        )}

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#2a2d33] text-gray-300">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3 text-center">Top Pick</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((festival) => {
                const isEditing = editingId === festival.id;
                return (
                  <tr key={festival.id} className="bg-[#30333a]">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          {draft.imageUrl ? (
                            <img
                              src={draft.imageUrl}
                              alt="Festival"
                              className="h-16 w-24 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-16 w-24 rounded-lg border border-white/10 bg-white/5" />
                          )}
                          <input
                            type="url"
                            value={draft.imageUrl || ''}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, imageUrl: e.target.value }))
                            }
                            placeholder="Image URL"
                            className="w-40 rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-xs text-white"
                          />
                          <label className="text-xs text-gray-300">
                            Upload file
                            <input
                              type="file"
                              accept="image/*"
                              className="block w-full text-xs"
                              onChange={(e) => handleFileUpload(e.target.files?.[0])}
                            />
                          </label>
                        </div>
                      ) : festival.imageUrl ? (
                        <img
                          src={festival.imageUrl}
                          alt="Festival"
                          className="h-16 w-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-24 rounded-lg border border-white/10 bg-white/5" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {isEditing ? (
                        <input
                          value={draft.title || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, title: e.target.value }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        festival.title
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.city || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, city: e.target.value }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        festival.city || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.country || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, country: e.target.value }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        festival.country || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.startDate || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, startDate: e.target.value }))
                          }
                          className="w-28 rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        formatDate(festival.startDate) || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.endDate || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, endDate: e.target.value }))
                          }
                          className="w-28 rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : (
                        formatDate(festival.endDate) || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {isEditing ? (
                        <input
                          value={draft.website || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, website: e.target.value }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-[#2a2d33] px-2 py-1 text-sm text-white"
                        />
                      ) : festival.website ? (
                        <a
                          href={festival.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#25edda] hover:text-[#23d9c8]"
                        >
                          Website
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={Boolean(draft.topPick)}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, topPick: e.target.checked }))
                          }
                          className="h-4 w-4 accent-[#25edda]"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={Boolean(festival.topPick)}
                          readOnly
                          className="h-4 w-4 accent-[#25edda]"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSave(festival.id)}
                              className="rounded-full bg-[#25edda] px-3 py-1 text-xs font-semibold text-[#1f2126]"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => handleReGeocode(festival.id)}
                              className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 hover:border-white/30"
                            >
                              Re-geocode
                            </button>
                            <button
                              onClick={() => clearAllOverrides(festival.id)}
                              className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 hover:border-white/30"
                            >
                              Clear all
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(festival)}
                              className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 hover:border-white/30"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(festival.id)}
                              className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:border-red-400"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#2a2d33] p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Festival / Marathon</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-white/10 p-2 text-gray-300 hover:border-white/30"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-gray-400">Name *</label>
                <input
                  value={createDraft.title}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Website</label>
                <input
                  value={createDraft.website}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, website: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Country</label>
                <input
                  value={createDraft.country}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, country: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">City</label>
                <input
                  value={createDraft.city}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Start Date (YYYY-MM-DD)</label>
                <input
                  value={createDraft.startDate}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">End Date (YYYY-MM-DD)</label>
                <input
                  value={createDraft.endDate}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400">Date Text (optional)</label>
                <input
                  value={createDraft.dateText}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, dateText: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Image URL</label>
                <input
                  value={createDraft.imageUrl}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-400">Latitude</label>
                  <input
                    value={createDraft.latitude}
                    onChange={(e) =>
                      setCreateDraft((prev) => ({ ...prev, latitude: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Longitude</label>
                  <input
                    value={createDraft.longitude}
                    onChange={(e) =>
                      setCreateDraft((prev) => ({ ...prev, longitude: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#30333a] px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="topPick"
                  type="checkbox"
                  checked={Boolean(createDraft.topPick)}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, topPick: e.target.checked }))
                  }
                  className="h-4 w-4 accent-[#25edda]"
                />
                <label htmlFor="topPick" className="text-sm text-gray-300">
                  Mark as Top Pick
                </label>
              </div>
            </div>

            {createStatus && (
              <p className="mt-4 text-sm text-red-400">{createStatus}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFestival}
                className="rounded-full bg-[#25edda] px-4 py-2 text-sm font-semibold text-[#1f2126]"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
