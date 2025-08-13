'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PlusIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ManageCortinasPage() {
  const [cortinas, setCortinas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [isConfirming, setIsConfirming] = useState(false);
  const [cortinaToDelete, setCortinaToDelete] = useState(null);

  useEffect(() => {
    const fetchCortinas = async () => {
      try {
        const response = await fetch('/api/cortinas/manage');
        if (!response.ok) {
          throw new Error('Failed to fetch cortinas.');
        }
        const data = await response.json();
        setCortinas(data.cortinas);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCortinas();
  }, []);

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
      if (!response.ok) {
        throw new Error('Failed to delete cortina.');
      }
      setCortinas(prev => prev.filter(c => c.id !== cortinaToDelete.id));
    } catch (err) {
      setError(err.message);
      alert('An error occurred while deleting the cortina.');
    } finally {
      setIsConfirming(false);
      setCortinaToDelete(null);
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
      <div className="max-w-4xl w-full mx-auto flex flex-col h-full">
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

        <div className="flex-grow overflow-hidden rounded-2xl shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <main className="h-full overflow-y-auto">
            {isLoading && <p className="text-center py-8">Loading cortinas...</p>}
            {error && <p className="text-red-400 text-center py-8">Error: {error}</p>}
            {!isLoading && !error && cortinas.length > 0 && (
              cortinas.map(cortina => (
                <div key={cortina.id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-b-0">
                  <div>
                    <p className="text-white">{cortina.title}</p>
                    <p className="text-gray-400 text-sm">{cortina.genre}</p>
                  </div>
                  <button onClick={() => handleDelete(cortina)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/10">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))
            )}
            {!isLoading && !error && cortinas.length === 0 && (
              <p className="text-center text-gray-400 py-8">No cortinas found. Click "Create New Cortina" to add one.</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
