'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PlusIcon, TrashIcon, ExclamationTriangleIcon, PlayCircleIcon, PauseCircleIcon, PencilIcon, ChevronDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

// --- NEW CortinaRow Component with Inline Editing ---
const COLUMN_LAYOUT = {
  button: 'flex-shrink-0 w-12',
  title: 'flex-[1.5] min-w-[150px]',
  artist: 'flex-[1.5] min-w-[160px]',
  genre: 'flex-[0.9] min-w-[110px]',
  start: 'flex-[1.2] min-w-[160px]',
  end: 'flex-[1.2] min-w-[160px]',
  actions: 'flex-[1.4] min-w-[100px]',
};


const TIME_PART_LIMITS = {
  minutes: 2,
  seconds: 2,
  deci: 1,
};

const formatTimeDisplay = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '00:00:0';
  }
  const totalDeciseconds = Math.round(Number(value) * 10);
  const minutes = Math.floor(totalDeciseconds / 600);
  const seconds = Math.floor((totalDeciseconds % 600) / 10);
  const deci = totalDeciseconds % 10;
  const minuteStr = minutes.toString().padStart(2, '0');
  const secondStr = seconds.toString().padStart(2, '0');
  return `${minuteStr}:${secondStr}:${deci}`;
};

const secondsToTimeParts = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return { minutes: '', seconds: '', deci: '' };
  }
  const totalDeciseconds = Math.round(Number(value) * 10);
  const minutes = Math.floor(totalDeciseconds / 600);
  const seconds = Math.floor((totalDeciseconds % 600) / 10);
  const deci = totalDeciseconds % 10;
  return {
    minutes: minutes.toString(),
    seconds: seconds.toString(),
    deci: deci.toString(),
  };
};

const sanitizePartInput = (part, raw) => {
  const digitsOnly = raw.replace(/\D/g, '');
  const limit = TIME_PART_LIMITS[part];
  return digitsOnly.slice(0, limit);
};

const padPartValue = (part, value) => {
  if (value === '') return '';
  const limit = TIME_PART_LIMITS[part];
  return value.padStart(limit, '0');
};

const partsToSeconds = (parts) => {
  const minutesStr = (parts.minutes ?? '').trim();
  const secondsStr = (parts.seconds ?? '').trim();
  const deciStr = (parts.deci ?? '').trim();

  const hasAny = minutesStr !== '' || secondsStr !== '' || deciStr !== '';
  if (!hasAny) {
    return { value: null, error: null };
  }

  const minutes = Number(minutesStr === '' ? 0 : minutesStr);
  const seconds = Number(secondsStr === '' ? 0 : secondsStr);
  const deci = Number(deciStr === '' ? 0 : deciStr);

  if ([minutes, seconds, deci].some(Number.isNaN)) {
    return { value: null, error: 'Time must use numeric values only.' };
  }
  if (minutes < 0 || minutes > 99) {
    return { value: null, error: 'Minutes must be between 0 and 99.' };
  }
  if (seconds < 0 || seconds > 59) {
    return { value: null, error: 'Seconds must be between 0 and 59.' };
  }
  if (deci < 0 || deci > 9) {
    return { value: null, error: 'Deciseconds must be between 0 and 9.' };
  }

  const totalSeconds = minutes * 60 + seconds + deci / 10;
  return { value: totalSeconds, error: null };
};

const CortinaRow = ({ cortina, onPlay, isPlaying, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    title: cortina.title,
    artist: cortina.artist || '',
    genre: cortina.genre,
  });
  const [timeDraft, setTimeDraft] = useState({
    start: secondsToTimeParts(cortina.startTime),
    end: secondsToTimeParts(cortina.endTime),
  });
  const [timeErrors, setTimeErrors] = useState({ start: null, end: null });

  const resetDraft = () => {
    setEditData({
      title: cortina.title,
      artist: cortina.artist || '',
      genre: cortina.genre,
    });
    setTimeDraft({
      start: secondsToTimeParts(cortina.startTime),
      end: secondsToTimeParts(cortina.endTime),
    });
    setTimeErrors({ start: null, end: null });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    resetDraft();
    setIsEditing(true);
  };

  const handleCancel = () => {
    resetDraft();
    setIsEditing(false);
  };

  const handleTimePartChange = (field, part, rawValue) => {
    setTimeDraft(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [part]: sanitizePartInput(part, rawValue),
      },
    }));
    setTimeErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleTimePartBlur = (field, part) => {
    setTimeDraft(prev => {
      const nextField = {
        ...prev[field],
        [part]: padPartValue(part, prev[field][part] ?? ''),
      };
      const result = partsToSeconds(nextField);
      setTimeErrors(errors => ({ ...errors, [field]: result.error }));
      return {
        ...prev,
        [field]: nextField,
      };
    });
  };

  const validateTimes = () => {
    const startResult = partsToSeconds(timeDraft.start);
    const endResult = partsToSeconds(timeDraft.end);
    setTimeErrors({ start: startResult.error, end: endResult.error });
    return { startResult, endResult };
  };

  const handleSave = async () => {
    const { startResult, endResult } = validateTimes();
    if (startResult.error || endResult.error) {
      return;
    }

    const payload = {
      title: editData.title.trim(),
      artist: editData.artist.trim(),
      genre: editData.genre.trim(),
      startTime: startResult.value,
      endTime: endResult.value,
    };

    setIsSaving(true);
    const success = await onUpdate(cortina.id, payload);
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const renderTimeDisplay = (value, wrapperClassName) => (
    <div className={`${wrapperClassName} flex justify-center`}>
      <p className="text-gray-200 text-center font-mono tracking-wide">{formatTimeDisplay(value)}</p>
    </div>
  );

  const renderTimeEditor = (field, wrapperClassName) => {
    const draft = timeDraft[field];
    const error = timeErrors[field];
    return (
      <div className={`${wrapperClassName} flex flex-col items-center justify-center`}>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="99"
            inputMode="numeric"
            value={draft.minutes}
            onChange={(e) => handleTimePartChange(field, 'minutes', e.target.value)}
            onBlur={() => handleTimePartBlur(field, 'minutes')}
            className="w-12 bg-[#3e424b] p-1 rounded text-center text-white focus:outline-none focus:ring-2 focus:ring-[#25edda]"
            placeholder="00"
          />
          <span className="text-gray-400">:</span>
          <input
            type="number"
            min="0"
            max="59"
            inputMode="numeric"
            value={draft.seconds}
            onChange={(e) => handleTimePartChange(field, 'seconds', e.target.value)}
            onBlur={() => handleTimePartBlur(field, 'seconds')}
            className="w-12 bg-[#3e424b] p-1 rounded text-center text-white focus:outline-none focus:ring-2 focus:ring-[#25edda]"
            placeholder="00"
          />
          <span className="text-gray-400">:</span>
          <input
            type="number"
            min="0"
            max="9"
            inputMode="numeric"
            value={draft.deci}
            onChange={(e) => handleTimePartChange(field, 'deci', e.target.value)}
            onBlur={() => handleTimePartBlur(field, 'deci')}
            className="w-10 bg-[#3e424b] p-1 rounded text-center text-white focus:outline-none focus:ring-2 focus:ring-[#25edda]"
            placeholder="0"
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-400 text-center max-w-[7rem]">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className={`flex items-center gap-2 p-2 border-b border-white/5 last:border-b-0 ${isPlaying ? 'bg-white/10' : ''}`}>
      <div className={`${COLUMN_LAYOUT.button} flex items-center justify-center`}>
        <button onClick={() => onPlay(cortina)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10">
          {isPlaying ? <PauseCircleIcon className="h-5 w-5 text-[#25edda]" /> : <PlayCircleIcon className="h-5 w-5" />}
        </button>
      </div>

      {isEditing ? (
        <>
          <input name="title" value={editData.title} onChange={handleInputChange} className={`${COLUMN_LAYOUT.title} bg-[#3e424b] p-1 rounded text-white`} />
          <input name="artist" value={editData.artist} onChange={handleInputChange} className={`${COLUMN_LAYOUT.artist} bg-[#3e424b] p-1 rounded text-white`} />
          <input name="genre" value={editData.genre} onChange={handleInputChange} className={`${COLUMN_LAYOUT.genre} bg-[#3e424b] p-1 rounded text-white`} />
          {renderTimeEditor('start', COLUMN_LAYOUT.start)}
          {renderTimeEditor('end', COLUMN_LAYOUT.end)}
          <div className={`${COLUMN_LAYOUT.actions} flex justify-end items-center gap-2`}>
            <button onClick={handleSave} disabled={isSaving} className="px-3 py-2 rounded-full bg-[#25edda]/20 text-[#25edda] hover:bg-[#25edda]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
              <CheckIcon className="h-4 w-4" />
              Save
            </button>
            <button onClick={handleCancel} className="px-3 py-2 rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20 flex items-center gap-1">
              <XMarkIcon className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`${COLUMN_LAYOUT.title} flex items-center gap-2 min-w-0`}>
            <p className="text-white truncate">{cortina.title}</p>
          </div>
          <div className={`${COLUMN_LAYOUT.artist} text-gray-400 truncate`}>
            {cortina.artist || 'N/A'}
          </div>
          <div className={`${COLUMN_LAYOUT.genre} text-gray-400 truncate`}>{cortina.genre}</div>
          {renderTimeDisplay(cortina.startTime, COLUMN_LAYOUT.start)}
          {renderTimeDisplay(cortina.endTime, COLUMN_LAYOUT.end)}
          <div className={`${COLUMN_LAYOUT.actions} flex justify-end items-center gap-2`}>
            <button onClick={handleEditClick} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10"><PencilIcon className="h-5 w-5" /></button>
            <button onClick={() => onDelete(cortina)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/10"><TrashIcon className="h-5 w-5" /></button>
          </div>
        </>
      )}
    </div>
  );
};


export default function ManageCortinasPage() {
  const [allCortinas, setAllCortinas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [fadeSettings, setFadeSettings] = useState({ fadeInSeconds: 0, fadeOutSeconds: 0 });
  const [fadeDraft, setFadeDraft] = useState({ fadeInSeconds: '0', fadeOutSeconds: '0' });
  const [fadeError, setFadeError] = useState(null);
  const [isSavingFade, setIsSavingFade] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [cortinaToDelete, setCortinaToDelete] = useState(null);

  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const [filterGenre, setFilterGenre] = useState('all');
  const [sortBy, setSortBy] = useState('title');

  useEffect(() => {
    const fetchFadeSettings = async () => {
      try {
        const response = await fetch('/api/cortinas/settings', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch fade settings.');
        const data = await response.json();
        const sanitized = {
          fadeInSeconds: Number(data.fadeInSeconds) || 0,
          fadeOutSeconds: Number(data.fadeOutSeconds) || 0,
        };
        setFadeSettings(sanitized);
        setFadeDraft({
          fadeInSeconds: sanitized.fadeInSeconds.toString(),
          fadeOutSeconds: sanitized.fadeOutSeconds.toString(),
        });
        setFadeError(null);
      } catch (err) {
        console.error('Failed to fetch fade settings:', err);
        setFadeError(err.message || 'Failed to fetch fade settings.');
      }
    };
    fetchFadeSettings();
  }, []);

  useEffect(() => {
    const fetchCortinas = async () => {
      try {
        const response = await fetch('/api/cortinas/manage', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch cortinas.');
        const data = await response.json();
        setAllCortinas(data.cortinas);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCortinas();
  }, []);

  const displayedCortinas = useMemo(() => {
    let cortinas = [...allCortinas];
    if (filterGenre !== 'all') {
      cortinas = cortinas.filter(c => c.genre === filterGenre);
    }
    if (sortBy === 'title') {
      cortinas.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'artist') {
      cortinas.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    }
    return cortinas;
  }, [allCortinas, filterGenre, sortBy]);

  const allGenres = useMemo(() => Array.from(new Set(allCortinas.map(c => c.genre))).sort(), [allCortinas]);

  const parsedFadeDraft = useMemo(() => ({
    fadeInSeconds: Math.max(0, Number(fadeDraft.fadeInSeconds) || 0),
    fadeOutSeconds: Math.max(0, Number(fadeDraft.fadeOutSeconds) || 0),
  }), [fadeDraft]);

  const isFadeDirty = parsedFadeDraft.fadeInSeconds !== fadeSettings.fadeInSeconds ||
    parsedFadeDraft.fadeOutSeconds !== fadeSettings.fadeOutSeconds;

  const handleDelete = (cortina) => {
    setCortinaToDelete(cortina);
    setIsConfirming(true);
  };

  const handleFadeDraftChange = (field, value) => {
    setFadeDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleResetFadeDraft = () => {
    setFadeDraft({
      fadeInSeconds: fadeSettings.fadeInSeconds.toString(),
      fadeOutSeconds: fadeSettings.fadeOutSeconds.toString(),
    });
    setFadeError(null);
  };

  const handleSaveFadeSettings = async () => {
    setFadeError(null);
    const payload = {
      fadeInSeconds: parsedFadeDraft.fadeInSeconds,
      fadeOutSeconds: parsedFadeDraft.fadeOutSeconds,
    };
    setIsSavingFade(true);
    try {
      const response = await fetch('/api/cortinas/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save fade settings.');
      const data = await response.json();
      const sanitized = {
        fadeInSeconds: Number(data.fadeInSeconds) || 0,
        fadeOutSeconds: Number(data.fadeOutSeconds) || 0,
      };
      setFadeSettings(sanitized);
      setFadeDraft({
        fadeInSeconds: sanitized.fadeInSeconds.toString(),
        fadeOutSeconds: sanitized.fadeOutSeconds.toString(),
      });
    } catch (err) {
      console.error('Failed to save fade settings:', err);
      setFadeError(err.message || 'Failed to save fade settings.');
    } finally {
      setIsSavingFade(false);
    }
  };

  const confirmDelete = async () => {
    if (!cortinaToDelete) return;
    try {
      const response = await fetch(`/api/cortinas/manage?id=${cortinaToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete cortina.');
      setAllCortinas(prev => prev.filter(c => c.id !== cortinaToDelete.id));
    } catch (err) {
      setError(err.message);
      alert('An error occurred while deleting the cortina.');
    } finally {
      setIsConfirming(false);
      setCortinaToDelete(null);
    }
  };
  
  const handlePlay = (cortina) => {
    if (currentlyPlaying?.id === cortina.id) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
    } else {
      setCurrentlyPlaying(cortina);
    }
  };
  
  useEffect(() => {
    if (currentlyPlaying && audioRef.current) {
      const startTime = currentlyPlaying.startTime || 0;
      audioRef.current.src = currentlyPlaying.playableUrl;
      audioRef.current.currentTime = startTime;
      audioRef.current.ontimeupdate = () => {
        if (currentlyPlaying.endTime && audioRef.current.currentTime >= currentlyPlaying.endTime) audioRef.current.pause();
      };
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [currentlyPlaying]);

  // --- NEW FUNCTION to handle updates ---
  const handleUpdateCortina = async (cortinaId, updatedData) => {
    try {
      const response = await fetch(`/api/cortinas/manage?id=${cortinaId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!response.ok) throw new Error('Failed to update cortina.');
      
      setAllCortinas(prev => prev.map(c => 
        c.id === cortinaId ? { ...c, ...updatedData } : c
      ));
      setCurrentlyPlaying(prev => (prev && prev.id === cortinaId ? { ...prev, ...updatedData } : prev));
      return true; // Success
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update cortina. Please try again.");
      return false; // Failure
    }
  };

  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#3e424b] rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Are you sure?</h2>
        <p className="text-gray-300 mb-6">
          This will permanently delete the cortina &quot;{cortinaToDelete?.title}&quot;. This action cannot be undone.
        </p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setIsConfirming(false)} className="px-6 py-2 rounded-full text-white bg-gray-500 hover:bg-gray-600">Cancel</button>
          <button onClick={confirmDelete} className="px-6 py-2 rounded-full text-white bg-red-600 hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#30333a] text-white p-4 sm:p-8">
      {isConfirming && <ConfirmationModal />}
      <div className="max-w-6xl w-full mx-auto flex flex-col h-full">
        <header className="flex justify-between items-center mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin/dashboard')} className="p-2 rounded-full hover:bg-white/10">
              <ArrowLeftIcon className="h-6 w-6 text-white" />
            </button>
            <h1 className="text-3xl font-bold text-white">Manage Cortinas</h1>
          </div>
          <button 
            onClick={() => router.push('/admin/create-cortina')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-[#25edda]/10 hover:bg-[#25edda]/20 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create New Cortina
          </button>
        </header>

        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
                <label htmlFor="filterGenre" className="block text-sm font-medium text-gray-400 mb-1">Filter by Genre</label>
                <select id="filterGenre" value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className="w-full h-12 p-3 pr-10 rounded-full appearance-none bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]">
                    <option value="all">All Genres</option>
                    {allGenres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
                </select>
                <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-4 top-[3.2rem] -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="flex-1 relative">
                <label htmlFor="sortBy" className="block text-sm font-medium text-gray-400 mb-1">Sort By</label>
                <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full h-12 p-3 pr-10 rounded-full appearance-none bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]">
                    <option value="title">Title (A-Z)</option>
                    <option value="artist">Artist (A-Z)</option>
                </select>
                <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-4 top-[3.2rem] -translate-y-1/2 pointer-events-none" />
            </div>
        </div>

        <div className="flex-shrink-0 mt-4 bg-[#222429] rounded-2xl p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Cortina Fade Settings</h2>
              <p className="text-sm text-gray-300 mt-1">Set global fade-in and fade-out durations applied to every cortina.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveFadeSettings}
                disabled={!isFadeDirty || isSavingFade}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${(!isFadeDirty || isSavingFade) ? 'bg-[#1f2126] text-gray-500 cursor-not-allowed' : 'bg-[#25edda]/20 text-[#25edda] hover:bg-[#25edda]/30'}`}
              >
                {isSavingFade ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleResetFadeDraft}
                disabled={isSavingFade || !isFadeDirty}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${(isSavingFade || !isFadeDirty) ? 'bg-[#1f2126] text-gray-500 cursor-not-allowed' : 'bg-[#30333a] text-gray-300 hover:bg-[#3b3e44]'}`}
              >
                Reset
              </button>
            </div>
          </div>
          {fadeError && (<p className="mt-3 text-sm text-red-400">{fadeError}</p>)}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-300">Fade In (seconds)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={fadeDraft.fadeInSeconds}
                onChange={(e) => handleFadeDraftChange('fadeInSeconds', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#30333a] p-3 text-white focus:outline-none focus:ring-2 focus:ring-[#25edda]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-300">Fade Out (seconds)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={fadeDraft.fadeOutSeconds}
                onChange={(e) => handleFadeDraftChange('fadeOutSeconds', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#30333a] p-3 text-white focus:outline-none focus:ring-2 focus:ring-[#25edda]"
              />
            </label>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 p-4 text-sm text-gray-400 font-semibold flex-shrink-0 border-b border-t border-white/10">
            <div className={`${COLUMN_LAYOUT.button}`} />
            <p className={`${COLUMN_LAYOUT.title} flex items-center gap-2`}>TITLE <span className="px-2 py-0.5 bg-[#25edda]/10 text-[#25edda] text-xs font-bold rounded-full">{allCortinas.length}</span></p>
            <p className={`${COLUMN_LAYOUT.artist}`}>ARTIST</p>
            <p className={`${COLUMN_LAYOUT.genre}`}>GENRE</p>
            <p className={`${COLUMN_LAYOUT.start} text-center`}>START (mm:ss:d)</p>
            <p className={`${COLUMN_LAYOUT.end} text-center`}>END (mm:ss:d)</p>
            <p className={`${COLUMN_LAYOUT.actions} text-right`}>ACTIONS</p>
        </div>

        <div className="flex-grow overflow-hidden rounded-b-2xl shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <main className="h-full overflow-y-auto">
            {isLoading && <p className="text-center py-8">Loading cortinas...</p>}
            {error && <p className="text-red-400 text-center py-8">Error: {error}</p>}
            {!isLoading && !error && displayedCortinas.map(cortina => (
              <CortinaRow 
                key={cortina.id} 
                cortina={cortina} 
                onPlay={handlePlay}
                isPlaying={isPlaying && currentlyPlaying?.id === cortina.id}
                onDelete={handleDelete}
                onUpdate={handleUpdateCortina}
              />
            ))}
            {!isLoading && !error && displayedCortinas.length === 0 && (
              <p className="text-center text-gray-400 py-8">No cortinas found. Click &quot;Create New Cortina&quot; to add one.</p>
            )}
          </main>
        </div>
        
        {currentlyPlaying && (
            <div className="flex-shrink-0 mt-4 p-4 bg-[#222429] rounded-xl shadow-lg">
                <p className="text-sm text-center text-gray-300">Now Playing: <span className="font-bold text-white">{currentlyPlaying.title}</span></p>
                <audio ref={audioRef} controls className="w-full mt-2" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} />
            </div>
        )}
      </div>
    </div>
  );
}










