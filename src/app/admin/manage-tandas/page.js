'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PencilIcon, TrashIcon, MusicalNoteIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ManageTandasPage() {
  const [tandas, setTandas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // --- NEW STATE for confirmation modal ---
  const [isConfirming, setIsConfirming] = useState(false);
  const [tandaToDelete, setTandaToDelete] = useState(null);

  useEffect(() => {
    const fetchTandas = async () => {
      try {
        const response = await fetch('/api/tandas/manage');
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const data = await response.json();
        setTandas(data.tandas);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTandas();
  }, []);

  const handleEdit = (tandaId) => {
    // We will implement this logic later
    alert(`Editing Tanda ID: ${tandaId}`);
  };

  // --- UPDATED: This now opens the confirmation modal ---
  const handleDelete = (tanda) => {
    setTandaToDelete(tanda);
    setIsConfirming(true);
  };

  // --- NEW FUNCTION: This handles the actual deletion ---
  const confirmDelete = async () => {
    if (!tandaToDelete) return;

    try {
      const response = await fetch(`/api/tandas/manage?id=${tandaToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete the tanda.');
      }

      // Update the UI by removing the deleted tanda from the list
      setTandas(prevTandas => prevTandas.filter(t => t.id !== tandaToDelete.id));

    } catch (err) {
      setError(err.message);
    } finally {
      // Close the modal
      setIsConfirming(false);
      setTandaToDelete(null);
    }
  };


  const TandaRow = ({ tanda }) => (
    <div className="bg-[#30333a] p-4 rounded-xl flex items-center justify-between gap-4 shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57]">
      <div className="flex items-center gap-4 overflow-hidden">
        <MusicalNoteIcon className="h-8 w-8 text-[#25edda] flex-shrink-0" />
        <div className="overflow-hidden">
          <p className="text-lg font-semibold text-white truncate">{tanda.orchestra}</p>
          <p className="text-sm text-gray-400 truncate">{tanda.singer || 'Instrumental'} - {tanda.type}</p>
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">
        <button onClick={() => handleEdit(tanda.id)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <PencilIcon className="h-5 w-5" />
        </button>
        {/* Pass the entire tanda object to the handler */}
        <button onClick={() => handleDelete(tanda)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/10 transition-colors">
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  // --- NEW COMPONENT: The confirmation modal ---
  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#3e424b] rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Are you sure?</h2>
        <p className="text-gray-300 mb-6">
          This will permanently delete the tanda for <span className="font-bold text-white">{tandaToDelete?.orchestra}</span> and all its files. This action cannot be undone.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setIsConfirming(false)}
            className="px-6 py-2 rounded-full text-white bg-gray-500 hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="px-6 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#30333a] text-white p-4 sm:p-8">
      {/* Render the modal if isConfirming is true */}
      {isConfirming && <ConfirmationModal />}

      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => router.push('/admin/dashboard')}
            className="p-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Manage Tandas</h1>
        </header>

        <main className="space-y-4">
          {isLoading && <p>Loading tandas...</p>}
          {error && <p className="text-red-400">Error: {error}</p>}
          {!isLoading && !error && tandas.map(tanda => (
            <TandaRow key={tanda.id} tanda={tanda} />
          ))}
           {!isLoading && !error && tandas.length === 0 && (
            <p className="text-center text-gray-400 py-8">No tandas found in the database.</p>
          )}
        </main>
      </div>
    </div>
  );
}
