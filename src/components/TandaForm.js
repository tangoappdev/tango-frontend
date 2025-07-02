'use client';
import { useState } from 'react';

// List of predefined orchestras for the datalist suggestion
const ORQUESTAS = [
  "Juan D'Arienzo", "Carlos Di Sarli", "Aníbal Troilo", "Osvaldo Pugliese",
  "Francisco Canaro", "Miguel Caló", "Ricardo Tanturi", "Rodolfo Biagi",
  "Alfredo De Angelis", "Enrique Rodríguez", "Ángel D'Agostino", "Edgardo Donato",
  "Lucio Demare", "Pedro Laurenz", "Juan Carlos Cobián", "Adolfo Carabelli",
  "Roberto Firpo", "Julio De Caro", "Horacio Salgán", "Héctor Varela",
  "Francisco Lomuto", "Orlando Goñi", "Osmar Maderna", "Ricardo Malerba", "Tipica Victor"
];

// Define category options constants for consistency
const CATEGORIES = {
  TRADITIONAL_GOLDEN_AGE: "Traditional (Golden Age)",
  CONTEMPORARY_TRADITIONAL: "Contemporary Traditional",
  ALTERNATIVE: "Alternative / Alternativo"
};


export default function TandaForm() {
  // State hooks for form inputs and component status
  const [imagePreview, setImagePreview] = useState(null); // URL for image preview
  const [imageFile, setImageFile] = useState(null);     // Actual image file object
  const [type, setType] = useState('Tango');             // Tanda type (Tango, Vals, Milonga)
  const [orquesta, setOrquesta] = useState('');          // Orchestra name input
  const [singer, setSinger] = useState('');              // Singer name input
  // --- *** Use constant for default category *** ---
  const [category, setCategory] = useState(CATEGORIES.TRADITIONAL_GOLDEN_AGE); // Tanda category
  const [style, setStyle] = useState('Rhythmic');        // Tanda style (Tango only)
  const [tracks, setTracks] = useState([                 // Array to hold track info (title & file)
    { title: '', file: null },
    { title: '', file: null },
    { title: '', file: null },
    { title: '', file: null } // Initialize with 4 potential slots
  ]);
  const [saving, setSaving] = useState(false);           // Loading state for submission
  const [success, setSuccess] = useState(false);         // Success message state

  // Handler for image file input change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file); // Store the file object
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handler for track title or file input changes
  const handleTrackChange = (index, field, value) => {
    const newTracks = [...tracks];
    newTracks[index][field] = value;
    setTracks(newTracks);
  };

  // Handler for form submission
  const handleSubmit = async () => {
    try {
      setSaving(true);
      setSuccess(false);

      const formData = new FormData();
      formData.append('orchestra', orquesta.trim());
      formData.append('singer', singer.trim());
      formData.append('type', type);
      // --- *** Ensure correct category value is appended *** ---
      formData.append('category', category); // Append the state value directly
      if (type === 'Tango') {
        formData.append('style', style);
      }
      if (imageFile) {
        formData.append('image', imageFile, imageFile.name);
      }

      const displayedTracks = type === 'Tango' ? 4 : 3;
      const selectedTracks = tracks.slice(0, displayedTracks);

      const titles = selectedTracks.map(t => t.title ? t.title.trim() : '');
      const files = selectedTracks.map(t => t.file);

      // Frontend Validation
      if (
        titles.length !== displayedTracks ||
        files.length !== displayedTracks ||
        titles.some(t => !t) ||
        files.some(f => !f)
      ) {
        console.error('Frontend Validation Failed:', { /* ... */ });
        throw new Error('Please ensure all required track titles and files are provided.');
      }

      titles.forEach(title => formData.append('titles[]', title));
      files.forEach(file => formData.append('files[]', file, file.name));

      // --- Logging FormData ---
      console.log("--- Frontend: FormData Content ---");
      for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
              console.log(`${key}:`, value.name, value.type, value.size);
          } else {
              console.log(`${key}:`, value);
          }
      }
      console.log("----------------------------------");
      // --- End Logging ---

      // Send request
      const res = await fetch('http://localhost:3100/api/tandas', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Server Error ${res.status}: ${errorText}`);
        throw new Error(`Server responded with ${res.status}. See console for details.`);
      }

      const result = await res.json();
      console.log('✅ Tanda saved!', result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // --- Reset Form Fields ---
      setTracks([ { title: '', file: null }, { title: '', file: null }, { title: '', file: null }, { title: '', file: null }, ]);
      if (imagePreview) { URL.revokeObjectURL(imagePreview); }
      setImagePreview(null);
      setImageFile(null);
      setOrquesta('');
      setSinger('');
      setType('Tango');
      // --- *** Reset category to default constant *** ---
      setCategory(CATEGORIES.TRADITIONAL_GOLDEN_AGE);
      setStyle('Rhythmic');

    } catch (error) {
      console.error('❌ Error saving tanda:', error);
      alert('Error saving tanda: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate displayed tracks and style selector visibility
  const displayedTracks = type === 'Tango' ? 4 : 3;
  const showStyleSelector = type === 'Tango';
  // Filter orchestra list for autocomplete
  const filteredOrquestas = ORQUESTAS.filter((o) =>
    orquesta && o.toLowerCase().includes(orquesta.toLowerCase())
  );

  // --- JSX for the Form ---
  return (
    <div className="min-h-screen bg-[#30333a] text-white font-quicksand p-10">
      <div className="max-w-4xl mx-auto p-6 md:p-10 rounded-[2rem] shadow-[5px_5px_10px_#181a1d,-5px_-5px_10px_#484d57]">
        <h1 className="text-3xl font-bold text-[#25edda] mb-6 text-center">Create New Tanda</h1>

        {/* Image Upload and Main Info Section */}
        <div className="flex flex-col md:flex-row gap-6 mb-6 items-start">
          {/* Image Upload Area */}
          <div className="relative w-48 h-48 flex-shrink-0">
            {imagePreview ? ( <img src={imagePreview} alt="Tanda artwork preview" className="w-full h-full object-cover rounded-[20px]" /> ) : ( <div className="w-full h-full bg-[#30333a] rounded-[20px] flex items-center justify-center text-sm text-gray-400 shadow-[inset_5px_5px_10px_#1f2126,inset_-5px_-5px_10px_#41454e]"> Upload cover image </div> )}
            <label className="absolute inset-0 flex items-center justify-center cursor-pointer group"> <span className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"> Click to upload </span> <input type="file" name="image" accept="image/*" onChange={handleImageChange} className="hidden" /> </label>
          </div>

          {/* Text Inputs and Type Selector */}
          <div className="flex-1 flex flex-col gap-4">
            <input list="orquesta-list" placeholder="Orquesta" value={orquesta} onChange={(e) => setOrquesta(e.target.value)} className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_5px_5px_10px_#1f2126,inset_-5px_-5px_10px_#41454e]" />
            <datalist id="orquesta-list"> {filteredOrquestas.map((o, i) => <option key={i} value={o} />)} </datalist>
            <input placeholder="Singer" value={singer} onChange={(e) => setSinger(e.target.value)} className="w-full h-12 p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_5px_5px_10px_#1f2126,inset_-5px_-5px_10px_#41454e]" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-12 p-3 rounded-full appearance-none bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_5px_5px_10px_#1f2126,inset_-5px_-5px_10px_#41454e]" >
              <option value="Tango">Tango</option>
              <option value="Milonga">Milonga</option>
              <option value="Vals">Vals</option>
            </select>
          </div>
        </div>

        {/* Category and Style Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Category Selector */}
          <select
            value={category} // Controlled component using state
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-12 p-3 rounded-full appearance-none bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_5px_5px_10px_#1f2126,inset_-5px_-5px_10px_#41454e]"
          >
            {/* --- *** FIXED: Ensure option value matches the exact string *** --- */}
            <option value={CATEGORIES.TRADITIONAL_GOLDEN_AGE}>{CATEGORIES.TRADITIONAL_GOLDEN_AGE}</option>
            <option value={CATEGORIES.CONTEMPORARY_TRADITIONAL}>{CATEGORIES.CONTEMPORARY_TRADITIONAL}</option>
            <option value={CATEGORIES.ALTERNATIVE}>{CATEGORIES.ALTERNATIVE}</option>
          </select>

          {/* Style Selector (Conditional) */}
          {showStyleSelector && (
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full h-12 p-3 rounded-full appearance-none bg-[#30333a] text-white focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_5px_5px_10px_#1f2126,inset_-5px_-5px_10px_#41454e]" >
              <option value="Rhythmic">Rhythmic</option>
              <option value="Melodic">Melodic</option>
            </select>
          )}
          {!showStyleSelector && <div className="hidden sm:block"></div>}
        </div>

        {/* Track Upload Section */}
        <p className="mb-4 text-[#25edda]">Upload Tracks ({displayedTracks})</p>
        {tracks.slice(0, displayedTracks).map((track, index) => (
          <div key={index} className="grid grid-cols-12 gap-4 items-center mb-4">
            <input type="text" placeholder={`Track ${index + 1} Title`} value={track.title} onChange={(e) => handleTrackChange(index, 'title', e.target.value)} className="col-span-7 md:col-span-8 p-3 rounded-full bg-[#30333a] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_5px_5px_10px_#1f2126,inset_-5px_-5px_10px_#41454e]" />
            <label className="col-span-5 md:col-span-4 px-4 py-2 rounded-full text-sm text-[#25edda] text-center cursor-pointer shadow-[5px_5px_10px_#1f2126,-5px_-5px_10px_#41454e] hover:shadow-[inset_2px_2px_5px_#1f2126,inset_-2px_-2px_5px_#41454e] transition-shadow duration-150 ease-in-out">
              {track.file ? track.file.name : 'Upload File'}
              <input type="file" accept="audio/*" onChange={(e) => handleTrackChange(index, 'file', e.target.files[0])} className="hidden" />
            </label>
          </div>
        ))}

        {/* Submit Button */}
        <button onClick={handleSubmit} disabled={saving} className={`mt-6 w-full h-12 rounded-full border-2 border-[#25edda] font-bold transition duration-150 ease-in-out ${saving ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'text-[#25edda] hover:bg-[#25edda] hover:text-[#30333a]'}`} >
          {saving ? 'Saving...' : 'Save Tanda'}
        </button>
        {/* Success Message */}
        {success && ( <p className="text-green-400 text-center mt-4 transition-opacity duration-500 ease-in-out"> Tanda saved successfully! </p> )}
      </div>
    </div>
  );
}
