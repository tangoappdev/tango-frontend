'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PlayCircleIcon, PencilIcon, TrashIcon, PauseCircleIcon, ChevronDownIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';

// --- TrackRow Component ---
const TrackRow = ({ track, onPlay, isPlaying, onUpdateTitle, onDelete, onReplaceFile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(track.title);
  const fileInputRef = useRef(null);

  const handleSave = async () => {
    if (newTitle.trim() === '' || newTitle === track.title) {
      setIsEditing(false);
      return;
    }
    const success = await onUpdateTitle(track.uniqueId, newTitle);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setNewTitle(track.title);
    setIsEditing(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onReplaceFile(track, file);
    }
  };

  return (
    <div className={`grid grid-cols-12 gap-4 items-center p-4 border-b border-white/5 last:border-b-0 ${isPlaying ? 'bg-white/10' : ''}`}>
      <div className="col-span-4 text-white truncate flex items-center gap-2 group">
        {isEditing ? (
          <>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-[#3e424b] text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#25edda]"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button onClick={handleSave} className="p-1 text-green-400 hover:text-white"><CheckIcon className="h-5 w-5"/></button>
            <button onClick={handleCancel} className="p-1 text-red-400 hover:text-white"><XMarkIcon className="h-5 w-5"/></button>
          </>
        ) : (
          <>
            <p className="truncate">{track.title}</p>
            <button onClick={() => setIsEditing(true)} className="p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <PencilIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <p className="col-span-3 text-gray-400 truncate">{track.orchestra}</p>
      <p className="col-span-1 text-gray-400 truncate">{track.type}</p>
      <p className="col-span-1 text-gray-400 truncate">{track.style || 'N/A'}</p>
      <p className="col-span-1 text-gray-400 truncate">{track.format}</p>
      <div className="col-span-2 flex justify-end items-center gap-2">
        <button onClick={() => onPlay(track)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10" title="Play/Pause"><PlayCircleIcon className="h-5 w-5" /></button>
        {/* --- NEW: Replace File Button --- */}
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="audio/mpeg,.mp3"/>
        <button onClick={() => fileInputRef.current.click()} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10" title="Replace File">
            <ArrowUpOnSquareIcon className="h-5 w-5" />
        </button>
        <button onClick={() => onDelete(track)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/10" title="Delete Track"><TrashIcon className="h-5 w-5" /></button>
      </div>
    </div>
  );
};


export default function TrackLibraryPage() {
  const [allTracks, setAllTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('title');

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState(null);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const response = await fetch('/api/tracks/manage');
        if (!response.ok) throw new Error('Failed to fetch track data.');
        const data = await response.json();
        setAllTracks(data.tracks);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTracks();
  }, []);

  const displayedTracks = useMemo(() => {
    let tracks = [...allTracks];
    if (filterType !== 'all') {
      tracks = tracks.filter(track => track.type === filterType);
    }
    if (sortBy === 'title') {
      tracks.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'orchestra') {
      tracks.sort((a, b) => a.orchestra.localeCompare(b.orchestra));
    }
    return tracks;
  }, [allTracks, filterType, sortBy]);
  
  const uniqueOrchestraCount = useMemo(() => new Set(allTracks.map(track => track.orchestra)).size, [allTracks]);

  const handlePlay = (track) => {
    if (currentlyPlaying?.uniqueId === track.uniqueId) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
    } else {
      setCurrentlyPlaying(track);
    }
  };
  
  useEffect(() => {
    if (currentlyPlaying && audioRef.current) {
      audioRef.current.src = currentlyPlaying.playableUrl;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [currentlyPlaying]);

  const handleUpdateTitle = async (trackId, newTitle) => {
    try {
      const response = await fetch(`/api/tracks/manage/${trackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTitle }),
      });
      if (!response.ok) throw new Error('Failed to update title.');
      
      setAllTracks(prev => prev.map(track => 
        track.uniqueId === trackId ? { ...track, title: newTitle } : track
      ));
      return true;
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update title. Please try again.");
      return false;
    }
  };

  const handleDeleteTrack = (track) => {
    setTrackToDelete(track);
    setIsConfirmingDelete(true);
  };

  const confirmDeleteTrack = async () => {
    if (!trackToDelete) return;
    try {
      const response = await fetch(`/api/tracks/manage/${trackToDelete.uniqueId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete the track.');
      }
      setAllTracks(prev => prev.filter(t => t.uniqueId !== trackToDelete.uniqueId));
    } catch (err) {
      setError(err.message);
      alert('Failed to delete track. Please try again.');
    } finally {
      setIsConfirmingDelete(false);
      setTrackToDelete(null);
    }
  };

  // --- NEW FUNCTION for replacing a file ---
  const handleReplaceFile = async (track, newFile) => {
    try {
        // 1. Call API to delete old file, update DB, and get a new upload URL
        const response = await fetch(`/api/tracks/manage/${track.uniqueId}/replace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newFileName: newFile.name }),
        });

        if (!response.ok) {
            throw new Error('Server failed to prepare for file replacement.');
        }

        const { uploadUrl, newFilePath } = await response.json();

        // 2. Upload the new file to the secure URL
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: newFile,
            headers: { 'Content-Type': newFile.type },
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload the new file.');
        }

        // 3. Update the local state to reflect the change instantly
        setAllTracks(prev => prev.map(t => {
            if (t.uniqueId === track.uniqueId) {
                return { 
                    ...t, 
                    url: newFilePath, 
                    format: newFile.name.split('.').pop().toUpperCase() 
                };
            }
            return t;
        }));

        alert('File replaced successfully!');

    } catch (err) {
        console.error('File replacement failed:', err);
        alert('An error occurred during file replacement. Please try again.');
    }
  };

  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#3e424b] rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Delete Track?</h2>
        <p className="text-gray-300 mb-6">
          Are you sure you want to permanently delete the track <span className="font-bold text-white">"{trackToDelete?.title}"</span>? This action cannot be undone.
        </p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setIsConfirmingDelete(false)} className="px-6 py-2 rounded-full text-white bg-gray-500 hover:bg-gray-600 transition-colors">Cancel</button>
          <button onClick={confirmDeleteTrack} className="px-6 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#30333a] text-white p-4 sm:p-8">
      {isConfirmingDelete && <ConfirmationModal />}
      <div className="max-w-7xl w-full mx-auto flex flex-col h-full">
        <header className="flex items-center gap-4 mb-6 flex-shrink-0">
          <button onClick={() => router.push('/admin/dashboard')} className="p-2 rounded-full hover:bg-white/10">
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Track Library</h1>
        </header>
        
        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <label htmlFor="filterType" className="block text-sm font-medium text-gray-400 mb-1">Filter by Type</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-12 p-3 pr-10 rounded-full appearance-none bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
            >
              <option value="all">All Types</option>
              <option value="Tango">Tango</option>
              <option value="Vals">Vals</option>
              <option value="Milonga">Milonga</option>
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-4 top-[3.2rem] -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="flex-1 relative">
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-400 mb-1">Sort By</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-12 p-3 pr-10 rounded-full appearance-none bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
            >
              <option value="title">Title (A-Z)</option>
              <option value="orchestra">Orchestra (A-Z)</option>
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-4 top-[3.2rem] -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-sm text-gray-400 font-semibold flex-shrink-0 border-b border-t border-white/10">
          <p className="col-span-4 flex items-center gap-2">
            <span>TITLE</span>
            <span className="px-2 py-0.5 bg-[#25edda]/10 text-[#25edda] text-xs font-bold rounded-full">{allTracks.length}</span>
          </p>
          <p className="col-span-3 flex items-center gap-2">
            <span>ORCHESTRA</span>
            <span className="px-2 py-0.5 bg-[#25edda]/10 text-[#25edda] text-xs font-bold rounded-full">{uniqueOrchestraCount}</span>
          </p>
          <p className="col-span-1">TYPE</p>
          <p className="col-span-1">STYLE</p>
          <p className="col-span-1">FORMAT</p>
          <p className="col-span-2 text-right">ACTIONS</p>
        </div>

        <div className="flex-grow overflow-hidden rounded-b-2xl shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <main className="h-full overflow-y-auto">
            {isLoading && <p className="text-center py-8">Loading tracks...</p>}
            {error && <p className="text-red-400 text-center py-8">Error: {error}</p>}
            {!isLoading && !error && displayedTracks.map(track => (
              <TrackRow 
                key={track.uniqueId} 
                track={track} 
                onPlay={handlePlay}
                isPlaying={isPlaying && currentlyPlaying?.uniqueId === track.uniqueId}
                onUpdateTitle={handleUpdateTitle}
                onDelete={handleDeleteTrack}
                onReplaceFile={handleReplaceFile}
              />
            ))}
             {!isLoading && !error && displayedTracks.length === 0 && (
              <p className="text-center text-gray-400 py-8">No tracks found for this filter.</p>
            )}
          </main>
        </div>
        
        {currentlyPlaying && (
            <div className="flex-shrink-0 mt-4 p-4 bg-[#222429] rounded-xl shadow-lg">
                <p className="text-sm text-center text-gray-300">Now Playing: <span className="font-bold text-white">{currentlyPlaying.title}</span></p>
                <audio
                    ref={audioRef}
                    controls
                    className="w-full mt-2"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                />
            </div>
        )}
      </div>
    </div>
  );
}
