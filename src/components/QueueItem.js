import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

export default function QueueItem({ tanda, onMenuOpen }) {
    if (!tanda) {
        return null;
    }

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tanda.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : 'auto',
    };

    // --- START: Logic for the tag is now here ---
    const getTagInfo = (type) => {
        if (!type || type === 'Tango') {
            return null; // Don't show a tag for regular Tangos
        }

        const styles = {
            Vals:   'text-[#25edda]',
            Milonga:   'text-[#25edda]',
        };

        return {
            text: type,
            style: styles[type] || 'bg-gray-500 text-white',
        };
    };

    const tagInfo = getTagInfo(tanda.type);
    // --- END: Logic for the tag ---

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes}
            className="flex items-center p-2 rounded-md hover:bg-white/10"
        >
            <img
                src={tanda.artwork_signed || '/default-artwork.png'}
                alt={`Artwork for ${tanda.orchestra}`}
                className="w-12 h-12 object-cover rounded-md flex-shrink-0"
            />
            
            <div className="flex-grow mx-3 overflow-hidden">
                <div className="flex items-center gap-1 flex-nowrap">
                    {/* --- UPDATED: Added min-w-0 to allow truncation --- */}
                    <p className="text-white font-medium truncate min-w-0">{tanda.orchestra}</p>
                    
                    {/* --- START: Conditionally render the tag --- */}
                    {tagInfo && (
                        <span className={`px-2 py-0.5 rounded-full text-s font-semibold ${tagInfo.style}`}>
                            - {tagInfo.text}
                        </span>
                    )}
                    {/* --- END: Tag render --- */}

                </div>
                <p className="text-gray-400 text-sm truncate">{tanda.singer || 'Instrumental'}</p>
            </div>

            <div className="flex-shrink-0">
                <button 
                    {...listeners}
                    onClick={(e) => onMenuOpen(e, tanda)}
                    className="p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-full cursor-grab" 
                    title="Click for options, press and hold to drag"
                >
                    <EllipsisVerticalIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
}
