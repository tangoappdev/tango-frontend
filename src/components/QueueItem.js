'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- FIX: Added PlayCircleIcon back to the import ---
import { EllipsisVerticalIcon, PlayCircleIcon } from '@heroicons/react/24/solid';

// --- FIX: Added the onPlayNow prop back ---
export default function QueueItem({ tanda, onMenuOpen, onPlayNow }) {
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

    // --- FIX: Added the click handler back ---
    const handlePlayClick = (e) => {
        console.log("Play icon clicked in QueueItem!"); 
        e.stopPropagation(); // Prevent other click events
        if (onPlayNow) {
            onPlayNow(tanda);
        }
    };

    const getTagInfo = (type) => {
        if (type === 'Vals') {
            return { text: '(V)', style: 'text-[#25edda]' };
        }
        if (type === 'Milonga') {
            return { text: '(M)', style: 'text-[#25edda]' };
        }
        return null;
    };

    const tagInfo = getTagInfo(tanda.type);

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes}
            // --- FIX: Added 'group' class to enable hover effects ---
            className="group flex items-center p-2 rounded-md hover:bg-white/10"
        >
            {/* --- FIX: Restored the entire artwork container with the overlay --- */}
            <div className="relative w-12 h-12 object-cover rounded-md flex-shrink-0">
                <img
                    src={tanda.artwork_signed || '/default-artwork.png'}
                    alt={`Artwork for ${tanda.orchestra}`}
                    className="w-full h-full object-cover rounded-md"
                />
                {/* This is the Play Icon Overlay that appears on hover */}
                <div
                    onMouseDown={handlePlayClick}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                    <PlayCircleIcon className="h-8 w-8 text-white" />
                </div>
            </div>
            
            <div className="flex-grow mx-3 overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{tanda.orchestra}</p>
                    {tagInfo && (
                        <span className={`text-s font-semibold ${tagInfo.style}`}>
                            {tagInfo.text}
                        </span>
                    )}
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