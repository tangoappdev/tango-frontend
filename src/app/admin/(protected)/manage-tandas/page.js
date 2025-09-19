'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

// --- TandaRow Component ---
const TandaRow = ({ tanda, onEdit, onDelete, isGloballyExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(isGloballyExpanded);
  }, [isGloballyExpanded]);

  return (
    <div className="bg-transparent border-b border-white/5 last:border-b-0">
      {/* Main Tanda Info Row */}
      <div className="flex items-center p-4">
        <div className="flex-1 grid grid-cols-12 gap-4 items-center divide-x divide-gray-700/50">
          <div className="col-span-1 flex items-center pr-4">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded-full hover:bg-white/10">
              {isExpanded ? <ChevronDownIcon className="h-5 w-5 text-gray-400" /> : <ChevronRightIcon className="h-5 w-5 text-gray-400" />}
            </button>
          </div>
          <p className="col-span-4 text-white truncate pl-4">{tanda.orchestra}</p>
          <p className="col-span-3 text-gray-400 truncate pl-4">{tanda.singer || 'Instrumental'}</p>
          <p className="col-span-2 text-gray-400 truncate pl-4">{tanda.type}</p>
          <p className="col-span-2 text-gray-400 truncate pl-4">{tanda.style || 'N/A'}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 ml-4">
          <button onClick={() => onEdit(tanda.id)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <PencilIcon className="h-5 w-5" />
          </button>
          <button onClick={() => onDelete(tanda)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/10 transition-colors">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Expanded Track Details View */}
      {isExpanded && (
        <div className="pb-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-1"></div> {/* Spacer column */}
            <div className="col-span-11 border-t border-white/10 pt-3">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Tracks:</h4>
              {tanda.tracks && tanda.tracks.length > 0 ? (
                <ul className="space-y-1">
                  {tanda.tracks.map((track, index) => (
                    <li key={index} className="text-gray-300 text-sm truncate">
                      {index + 1}. {track.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No tracks found for this tanda.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default function ManageTandasPage() {
  const [allTandas, setAllTandas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [isConfirming, setIsConfirming] = useState(false);
  const [tandaToDelete, setTandaToDelete] = useState(null);

  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  
  const [areAllExpanded, setAreAllExpanded] = useState(false);

  useEffect(() => {
    const fetchTandas = async () => {
      try {
        const response = await fetch('/api/tandas/manage');
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const data = await response.json();
        setAllTandas(data.tandas);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTandas();
  }, []);

  const displayedTandas = useMemo(() => {
    let tandas = [...allTandas];
    if (filterType !== 'all') {
      tandas = tandas.filter(tanda => tanda.type === filterType);
    }
    if (sortBy === 'orchestra') {
      tandas.sort((a, b) => a.orchestra.localeCompare(b.orchestra));
    }
    return tandas;
  }, [allTandas, filterType, sortBy]);


  // --- UPDATED: This now navigates to the new edit page ---
  const handleEdit = (tandaId) => {
    router.push(`/admin/manage-tandas/edit-tanda/${tandaId}`);
  };

  const handleDelete = (tanda) => {
    setTandaToDelete(tanda);
    setIsConfirming(true);
  };

  const confirmDelete = async () => {
    if (!tandaToDelete) return;
    try {
      const response = await fetch(`/api/tandas/manage?id=${tandaToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete the tanda.');
      }
      setAllTandas(prevTandas => prevTandas.filter(t => t.id !== tandaToDelete.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConfirming(false);
      setTandaToDelete(null);
    }
  };

  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#3e424b] rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Are you sure?</h2>
        <p className="text-gray-300 mb-6">
          This will permanently delete the tanda for <span className="font-bold text-white">{tandaToDelete?.orchestra}</span> and all its files. This action cannot be undone.
        </p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setIsConfirming(false)} className="px-6 py-2 rounded-full text-white bg-gray-500 hover:bg-gray-600 transition-colors">Cancel</button>
          <button onClick={confirmDelete} className="px-6 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#30333a] text-white p-4 sm:p-8">
      {isConfirming && <ConfirmationModal />}
      <div className="max-w-6xl w-full mx-auto flex flex-col h-full">
        <header className="flex items-center gap-4 mb-6 flex-shrink-0">
          <button onClick={() => router.push('/admin/dashboard')} className="p-2 rounded-full hover:bg-white/10">
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Manage Tandas</h1>
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
              <option value="createdAt">Date Created (Newest)</option>
              <option value="orchestra">Orchestra (A-Z)</option>
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-4 top-[3.2rem] -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="hidden md:flex items-center p-4 text-sm text-gray-400 font-semibold flex-shrink-0 border-white/10">
          <div className="flex-1 grid grid-cols-12 gap-4 items-center divide-x divide-gray-700/50">
            <div className="col-span-1 flex items-center pr-4">
              <button onClick={() => setAreAllExpanded(!areAllExpanded)} className="p-1 rounded-full hover:bg-white/10" title={areAllExpanded ? "Collapse All" : "Expand All"}>
                {areAllExpanded ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
              </button>
            </div>
            <p className="col-span-4 pl-4">ORCHESTRA</p>
            <p className="col-span-3 pl-4">SINGER</p>
            <p className="col-span-2 pl-4">TYPE</p>
            <p className="col-span-2 pl-4">STYLE</p>
          </div>
          <div className="w-[72px] text-right pl-4">ACTIONS</div>
        </div>

        <div className="flex-grow overflow-hidden rounded-b-2xl shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <main className="h-full overflow-y-auto p-2">
            {isLoading && <p className="text-center py-8">Loading tandas...</p>}
            {error && <p className="text-red-400 text-center py-8">Error: {error}</p>}
            {!isLoading && !error && displayedTandas.map(tanda => (
              <TandaRow key={tanda.id} tanda={tanda} onEdit={handleEdit} onDelete={handleDelete} isGloballyExpanded={areAllExpanded} />
            ))}
            {!isLoading && !error && displayedTandas.length === 0 && (
              <p className="text-center text-gray-400 py-8">No tandas found for this filter.</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
