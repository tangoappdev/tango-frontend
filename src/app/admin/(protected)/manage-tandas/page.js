'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ChevronDownIcon, ExclamationTriangleIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { TandaRow } from './TandaRow';

const SummaryCard = ({ label, value, helper }) => (
  <div className="p-4 rounded-2xl bg-[#30333ab] border border-white/5">
    <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">{label}</p>
    <p className="text-2xl font-semibold text-white">{value}</p>
    {helper && <p className="text-xs text-gray-400 mt-1">{helper}</p>}
  </div>
);

const ConfirmationModal = ({ onCancel, onConfirm, tandaToDelete }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div className="bg-[#3e424b] rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
      <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">Are you sure?</h2>
      <p className="text-gray-300 mb-6">
        This will permanently delete the tanda for <span className="font-bold text-white">{tandaToDelete?.orchestra}</span> and all its files. This action cannot be undone.
      </p>
      <div className="flex justify-center gap-4">
        <button onClick={onCancel} className="px-6 py-2 rounded-full text-white bg-gray-500 hover:bg-gray-600 transition-colors">Cancel</button>
        <button onClick={onConfirm} className="px-6 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 transition-colors">Delete</button>
      </div>
    </div>
  </div>
);


export default function ManageTandasPage() {
  const [allTandas, setAllTandas] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [isConfirming, setIsConfirming] = useState(false);
  const [tandaToDelete, setTandaToDelete] = useState(null);

  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('orchestra');
  
  const [areAllExpanded, setAreAllExpanded] = useState(false);

  useEffect(() => {
    const fetchTandas = async () => {
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/tandas/manage`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const data = await response.json();
        setAllTandas(Array.isArray(data.tandas) ? data.tandas : []);
        setSummary(data.summary || null);
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
    } else if (sortBy === 'likesDesc') {
      tandas.sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0));
    } else if (sortBy === 'createdAt') {
      tandas.sort((a, b) => {
        const aDate = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const bDate = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return bDate - aDate;
      });
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
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/tandas/manage?id=${tandaToDelete.id}`;
      const response = await fetch(apiUrl, {
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

  return (
    <div className="h-screen flex flex-col bg-[#30333a] text-white p-4 sm:p-8">
      {isConfirming && (
        <ConfirmationModal onCancel={() => setIsConfirming(false)} onConfirm={confirmDelete} tandaToDelete={tandaToDelete} />
      )}
      <div className="max-w-6xl w-full mx-auto flex flex-col h-full">
        <header className="flex items-center justify-between gap-4 mb-6 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/dashboard')} className="p-2 rounded-full hover:bg-white/10">
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Manage Tandas</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/upload')}
              className="px-4 py-2 rounded-full bg-[#25edda] text-[#1f2126] font-semibold hover:bg-[#23d9c8] transition-colors"
            >
              + New Tanda
            </button>
          </div>
        </header>

        {summary && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <SummaryCard label="Total Tandas" value={summary.totalTandas} helper={`Total likes ${summary.totalLikes ?? 0}`} />
            <SummaryCard label="Unique Orchestras" value={summary.totalOrchestras} />
            <SummaryCard label="Tango (Melodic)" value={summary.tango?.melodic ?? 0} helper={`${summary.tango?.total ?? 0} total`} />
            <SummaryCard label="Tango (Rhythmic)" value={summary.tango?.rhythmic ?? 0} />
            <SummaryCard label="Vals" value={summary.vals ?? 0} />
            <SummaryCard label="Milonga" value={summary.milonga ?? 0} />
          </section>
        )}

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
              <option value="orchestra">Orchestra (A-Z)</option>
              <option value="likesDesc">Most Liked</option>
              <option value="createdAt">Date Created (Newest)</option>
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-4 top-[3.2rem] -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="hidden md:flex items-center p-4 text-sm text-gray-400 font-semibold flex-shrink-0 border-white/10">
          <div className="flex-1 grid grid-cols-13 gap-4 items-center divide-x divide-gray-700/50">
            <div className="col-span-1 flex items-center pr-4">
              <button onClick={() => setAreAllExpanded(!areAllExpanded)} className="p-1 rounded-full hover:bg-white/10" title={areAllExpanded ? "Collapse All" : "Expand All"}>
                {areAllExpanded ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
              </button>
            </div>
            <p className="col-span-4 pl-4">ORCHESTRA</p>
            <p className="col-span-3 pl-4">SINGER</p>
            <p className="col-span-2 pl-4">TYPE</p>
            <p className="col-span-2 pl-4">STYLE</p>
            <p className="col-span-1 pl-4 text-right">LIKES</p>
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
