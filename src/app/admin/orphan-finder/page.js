'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, TrashIcon, ExclamationTriangleIcon, MusicalNoteIcon, PhotoIcon } from '@heroicons/react/24/outline';

export default function OrphanFinderPage() {
  const [orphanedFiles, setOrphanedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const [isConfirming, setIsConfirming] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState([]);

  useEffect(() => {
    const fetchOrphans = async () => {
      try {
        const response = await fetch('/api/tracks/orphans');
        if (!response.ok) {
          throw new Error('Failed to fetch orphaned files.');
        }
        const data = await response.json();
        setOrphanedFiles(data.orphanedFiles);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrphans();
  }, []);

  const handleDelete = (files) => {
    setFilesToDelete(files);
    setIsConfirming(true);
  };

  const confirmDelete = async () => {
    if (filesToDelete.length === 0) return;

    try {
      const response = await fetch('/api/tracks/orphans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths: filesToDelete }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete files.');
      }

      setOrphanedFiles(prev => prev.filter(file => !filesToDelete.includes(file)));
    } catch (err) {
      setError(err.message);
      alert('An error occurred while deleting files.');
    } finally {
      setIsConfirming(false);
      setFilesToDelete([]);
    }
  };
  
  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#3e424b] rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Are you sure?</h2>
        <p className="text-gray-300 mb-6">
          You are about to permanently delete {filesToDelete.length} file(s). This action cannot be undone.
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
        <header className="flex items-center gap-4 mb-6 flex-shrink-0">
          <button onClick={() => router.push('/admin/dashboard')} className="p-2 rounded-full hover:bg-white/10">
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Orphaned File Finder</h1>
        </header>

        <div className="flex-shrink-0 mb-4 p-4 bg-[#25edda]/10 text-[#25edda] rounded-lg text-sm">
          <p>This tool finds audio and artwork files in your storage that are not linked to any tanda in the database. You can safely delete these files to save space.</p>
        </div>
        
        {orphanedFiles.length > 0 && (
            <div className="flex justify-end mb-4">
                <button onClick={() => handleDelete(orphanedFiles)} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-full">
                    Delete All ({orphanedFiles.length})
                </button>
            </div>
        )}

        <div className="flex-grow overflow-hidden rounded-2xl shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <main className="h-full overflow-y-auto">
            {isLoading && <p className="text-center py-8">Scanning for orphaned files...</p>}
            {error && <p className="text-red-400 text-center py-8">Error: {error}</p>}
            {!isLoading && !error && orphanedFiles.length > 0 && (
              orphanedFiles.map(filePath => {
                const isArtwork = filePath.startsWith('artwork/');
                const Icon = isArtwork ? PhotoIcon : MusicalNoteIcon;
                const fileName = filePath.substring(filePath.indexOf('/') + 1);

                return (
                  <div key={filePath} className="flex items-center justify-between p-4 border-b border-white/5 last:border-b-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Icon className={`h-5 w-5 ${isArtwork ? 'text-blue-400' : 'text-teal-400'} flex-shrink-0`} />
                        <p className="text-gray-300 text-sm truncate">{fileName}</p>
                    </div>
                    <button onClick={() => handleDelete([filePath])} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/10">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                );
              })
            )}
            {!isLoading && !error && orphanedFiles.length === 0 && (
              <p className="text-center text-gray-400 py-8">No orphaned files found. Your storage is clean!</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
