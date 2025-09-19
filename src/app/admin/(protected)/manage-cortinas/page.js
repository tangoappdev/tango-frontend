'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PlusIcon, TrashIcon, ExclamationTriangleIcon, PlayCircleIcon, PauseCircleIcon, PencilIcon, ChevronDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

// --- NEW CortinaRow Component with Inline Editing ---
const CortinaRow = ({ cortina, onPlay, isPlaying, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: cortina.title,
    artist: cortina.artist || '',
    genre: cortina.genre,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const success = await onUpdate(cortina.id, editData);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      title: cortina.title,
      artist: cortina.artist || '',
      genre: cortina.genre,
    });
    setIsEditing(false);
  };

  return (
    <div className={`grid grid-cols-10 gap-4 items-center p-4 border-b border-white/5 last:border-b-0 ${isPlaying ? 'bg-white/10' : ''}`}>
      {isEditing ? (
        <>
          <input name="title" value={editData.title} onChange={handleInputChange} className="col-span-4 bg-[#3e424b] p-1 rounded" />
          <input name="artist" value={editData.artist} onChange={handleInputChange} className="col-span-3 bg-[#3e424b] p-1 rounded" />
          <input name="genre" value={editData.genre} onChange={handleInputChange} className="col-span-2 bg-[#3e424b] p-1 rounded" />
          <div className="col-span-1 flex justify-end items-center gap-2">
            <button onClick={handleSave} className="p-2 text-green-400 hover:text-white rounded-full"><CheckIcon className="h-5 w-5"/></button>
            <button onClick={handleCancel} className="p-2 text-red-400 hover:text-white rounded-full"><XMarkIcon className="h-5 w-5"/></button>
          </div>
        </>
      ) : (
        <>
          <p className="col-span-4 text-white truncate">{cortina.title}</p>
          <p className="col-span-3 text-gray-400 truncate">{cortina.artist || 'N/A'}</p>
          <p className="col-span-2 text-gray-400 truncate">{cortina.genre}</p>
          <div className="col-span-1 flex justify-end items-center gap-2">
            <button onClick={() => onPlay(cortina)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10">
              {isPlaying ? <PauseCircleIcon className="h-5 w-5 text-[#25edda]" /> : <PlayCircleIcon className="h-5 w-5" />}
            </button>
            <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10"><PencilIcon className="h-5 w-5" /></button>
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

  const [isConfirming, setIsConfirming] = useState(false);
  const [cortinaToDelete, setCortinaToDelete] = useState(null);

  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const [filterGenre, setFilterGenre] = useState('all');
  const [sortBy, setSortBy] = useState('title');

  useEffect(() => {
    const fetchCortinas = async () => {
      try {
        const response = await fetch('/api/cortinas/manage');
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

  const handleDelete = (cortina) => {
    setCortinaToDelete(cortina);
    setIsConfirming(true);
  };

  const confirmDelete = async () => {
    if (!cortinaToDelete) return;
    try {
      const response = await fetch(`/api/cortinas/manage?id=${cortinaToDelete.id}`, {
        method: 'DELETE',
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
      audioRef.current.src = currentlyPlaying.playableUrl;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [currentlyPlaying]);

  // --- NEW FUNCTION to handle updates ---
  const handleUpdateCortina = async (cortinaId, updatedData) => {
    try {
      const response = await fetch(`/api/cortinas/manage/${cortinaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!response.ok) throw new Error('Failed to update cortina.');
      
      setAllCortinas(prev => prev.map(c => 
        c.id === cortinaId ? { ...c, ...updatedData } : c
      ));
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
          This will permanently delete the cortina "{cortinaToDelete?.title}". This action cannot be undone.
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

        <div className="hidden md:grid grid-cols-10 gap-4 p-4 text-sm text-gray-400 font-semibold flex-shrink-0 border-b border-t border-white/10">
            <p className="col-span-4 flex items-center gap-2">TITLE <span className="px-2 py-0.5 bg-[#25edda]/10 text-[#25edda] text-xs font-bold rounded-full">{allCortinas.length}</span></p>
            <p className="col-span-3">ARTIST</p>
            <p className="col-span-2">GENRE</p>
            <p className="col-span-1 text-right">ACTIONS</p>
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
              <p className="text-center text-gray-400 py-8">No cortinas found. Click "Create New Cortina" to add one.</p>
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
