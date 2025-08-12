'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowUpOnSquareIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';

// --- Draggable Track Row Component ---
const DraggableTrackRow = ({ track, index, onTitleChange, onFileChange, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: track.id || index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-4 mb-4 bg-[#30333a] p-3 rounded-lg">
      <button {...attributes} {...listeners} className="cursor-grab p-2 text-gray-400">
        <Bars3Icon className="h-6 w-6" />
      </button>
      <input
        type="text"
        placeholder={`Track ${index + 1} Title`}
        value={track.title}
        onChange={(e) => onTitleChange(index, e.target.value)}
        className="flex-grow p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
      />
      <label className="px-4 py-2 rounded-full text-sm text-center cursor-pointer shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e] transition-shadow duration-150 ease-in-out">
        <span className={track.newFile ? 'text-[#25edda]' : 'text-gray-400'}>
          {track.newFile ? track.newFile.name : 'Replace File'}
        </span>
        <input type="file" accept="audio/mpeg, .mp3" onChange={(e) => onFileChange(index, e.target.files[0])} className="hidden" />
      </label>
       <button onClick={() => onRemove(index)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/10 transition-colors">
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
};


// --- The Main Edit Form Component ---
const EditTandaForm = ({ initialTanda }) => {
  const [formData, setFormData] = useState(initialTanda);
  const [imagePreview, setImagePreview] = useState(initialTanda.artwork_url_signed);
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTrackTitleChange = (index, newTitle) => {
    const newTracks = [...formData.tracks];
    newTracks[index].title = newTitle;
    setFormData(prev => ({ ...prev, tracks: newTracks }));
  };
  
  const handleTrackFileChange = (index, newFile) => {
    const newTracks = [...formData.tracks];
    newTracks[index].newFile = newFile;
    setFormData(prev => ({ ...prev, tracks: newTracks }));
  };
  
  const handleRemoveTrack = (index) => {
    const newTracks = formData.tracks.filter((_, i) => i !== index);
    setFormData(prev => ({...prev, tracks: newTracks}));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.tracks.findIndex((t, i) => (t.id || i) === active.id);
        const newIndex = prev.tracks.findIndex((t, i) => (t.id || i) === over.id);
        return { ...prev, tracks: arrayMove(prev.tracks, oldIndex, newIndex) };
      });
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    
    try {
        const filesToUpload = {};
        const filesToDelete = [];
        const newTrackData = [];
        
        // 1. Prepare Artwork
        let newArtworkPath = formData.artwork_url;
        if (imageFile) {
            if (formData.artwork_url) {
                filesToDelete.push(formData.artwork_url);
            }
            newArtworkPath = `artwork/${uuidv4()}-${imageFile.name}`;
            filesToUpload['artwork'] = newArtworkPath;
        }

        // 2. Prepare Tracks
        for (const track of formData.tracks) {
            let trackPath = track.url || track.filePath;
            if (track.newFile) {
                if (trackPath) {
                    filesToDelete.push(trackPath);
                }
                trackPath = `tracks/${uuidv4()}-${track.newFile.name}`;
                filesToUpload[`track_${formData.tracks.indexOf(track)}`] = trackPath;
            }
            newTrackData.push({ title: track.title, url: trackPath });
        }
        
        // 3. Prepare data for API
        const payload = {
            filesToUpload,
            filesToDelete,
            fieldsToUpdate: {
                orchestra: formData.orchestra,
                singer: formData.singer,
                artwork_url: newArtworkPath,
                tracks: newTrackData,
                // --- ADDED: Include style in the update ---
                style: formData.style
            }
        };

        // 4. Call the backend to update Firestore and get upload URLs
        const response = await fetch(`/api/tandas/manage/${formData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to update tanda on the server.');
        
        const { uploadUrls } = await response.json();

        // 5. Upload new files to Cloud Storage
        const uploadPromises = [];
        if (imageFile && uploadUrls.artwork) {
            uploadPromises.push(fetch(uploadUrls.artwork, { method: 'PUT', body: imageFile }));
        }
        formData.tracks.forEach((track, index) => {
            if (track.newFile && uploadUrls[`track_${index}`]) {
                uploadPromises.push(fetch(uploadUrls[`track_${index}`], { method: 'PUT', body: track.newFile }));
            }
        });
        
        await Promise.all(uploadPromises);

        alert('Tanda updated successfully!');
        router.push('/admin/manage-tandas');

    } catch (error) {
        console.error('Error updating tanda:', error);
        alert('An error occurred while saving. Please check the console.');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Artwork and Main Info */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="relative w-48 h-48 flex-shrink-0">
          {imagePreview ? <img src={imagePreview} alt="Artwork preview" className="w-full h-full object-cover rounded-[20px]" /> : <div className="w-full h-full bg-[#30333a] rounded-[20px] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"></div>}
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-[20px]">
            <ArrowUpOnSquareIcon className="h-8 w-8 text-white mb-1" />
            <span className="text-white text-xs text-center">Replace Artwork</span>
            <input type="file" name="image" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <input name="orchestra" value={formData.orchestra} onChange={handleInputChange} className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]" />
          <input name="singer" value={formData.singer} onChange={handleInputChange} className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]" />
          
          {/* --- ADDED: Style dropdown, only shown for Tango type --- */}
          {formData.type === 'Tango' && (
            <select 
              name="style" 
              value={formData.style || 'Rhythmic'} 
              onChange={handleInputChange} 
              className="w-full h-12 p-3 rounded-full appearance-none bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
            >
              <option value="Rhythmic">Rhythmic</option>
              <option value="Melodic">Melodic</option>
            </select>
          )}
        </div>
      </div>

      {/* Track List */}
      <div>
        <h2 className="text-xl font-bold mb-4">Tracks</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={formData.tracks.map((t, i) => t.id || i)} strategy={verticalListSortingStrategy}>
            {formData.tracks.map((track, index) => (
              <DraggableTrackRow
                key={track.id || index}
                track={track}
                index={index}
                onTitleChange={handleTrackTitleChange}
                onFileChange={handleTrackFileChange}
                onRemove={handleRemoveTrack}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-8 py-3 rounded-full bg-[#25edda] text-black font-bold hover:bg-opacity-80 transition-all disabled:bg-gray-500"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};


// --- The Main Page Component ---
export default function EditTandaPage() {
  const [tanda, setTanda] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const params = useParams();
  const router = useRouter();
  const { tandaId } = params;

  useEffect(() => {
    if (!tandaId) return;

    const fetchTanda = async () => {
      try {
        const response = await fetch(`/api/tandas/manage/${tandaId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tanda data.');
        }
        const data = await response.json();
        setTanda(data.tanda);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTanda();
  }, [tandaId]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#30333a] text-white flex items-center justify-center"><p>Loading Tanda...</p></div>;
  }

  if (error) {
    return <div className="min-h-screen bg-[#30333a] text-white flex items-center justify-center"><p className="text-red-400">Error: {error}</p></div>;
  }

  if (!tanda) {
    return <div className="min-h-screen bg-[#30333a] text-white flex items-center justify-center"><p>Tanda not found.</p></div>;
  }

  return (
    <div className="min-h-screen bg-[#30333a] text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => router.push('/admin/manage-tandas')}
            className="p-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Tanda</h1>
            <p className="text-gray-400">Editing: {tanda.orchestra}</p>
          </div>
        </header>

        <main>
          <EditTandaForm initialTanda={tanda} />
        </main>
      </div>
    </div>
  );
}
