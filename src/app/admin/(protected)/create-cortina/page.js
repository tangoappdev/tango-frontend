'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreateCortinaPage() {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [artist, setArtist] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !audioFile || !genre) {
      setError('All fields are required.');
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const apiResponse = await fetch('/api/cortinas/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          fileName: audioFile.name,
          genre: genre,
          artist: artist,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to create cortina record on the server.');
      }

      const { uploadUrl } = await apiResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: audioFile,
        headers: { 'Content-Type': audioFile.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload the audio file.');
      }

      alert('Cortina uploaded successfully!');
      router.push('/admin/manage-cortinas');

    } catch (err) {
      setError(err.message);
      console.error('Submission failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#30333a] text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => router.push('/admin/manage-cortinas')}
            className="p-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Create New Cortina</h1>
        </header>

        <form onSubmit={handleSubmit} className="p-8 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57] space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cortina A"
              className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
            />
          </div>

          <div>
            <label htmlFor="artist" className="block text-sm font-medium text-gray-400 mb-1">Artist (Optional)</label>
            <input
              id="artist"
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g., Juan D'Arienzo"
              className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
            />
          </div>
          
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-gray-400 mb-1">Genre</label>
            <input
              id="genre"
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g., Traditional, Alternative"
              className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
            />
          </div>

          <div>
            <label htmlFor="audioFile" className="block text-sm font-medium text-gray-400 mb-1">Audio File</label>
            <label className="w-full px-4 py-3 rounded-full text-sm text-center cursor-pointer shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e] transition-shadow duration-150 ease-in-out flex justify-center">
              <span className={audioFile ? 'text-[#25edda]' : 'text-gray-400'}>
                {audioFile ? audioFile.name : 'Click to Upload MP3'}
              </span>
              <input id="audioFile" type="file" accept="audio/mpeg,.mp3" onChange={(e) => setAudioFile(e.target.files[0])} className="hidden" />
            </label>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-12 rounded-full border-2 border-[#25edda] font-bold transition duration-150 ease-in-out text-[#25edda] hover:bg-[#25edda] hover:text-[#30333a] disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Cortina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
