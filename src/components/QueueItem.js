import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

// Note: No more `isDraggable` or `onAddToQueue`. We pass `onMenuOpen` instead.
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
    } = useSortable({ id: tanda.id }); // No more `disabled` property here

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} // Attributes stay on the main div for accessibility
            className="flex items-center p-2 rounded-md hover:bg-white/10"
        >
            <img
                src={tanda.artwork_signed || '/default-artwork.png'}
                alt={`Artwork for ${tanda.orchestra}`}
                className="w-12 h-12 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-grow mx-3 overflow-hidden">
                <p className="text-white font-medium truncate">{tanda.orchestra}</p>
                <p className="text-gray-400 text-sm truncate">{tanda.singer || 'Instrumental'}</p>
            </div>
            <div className="flex-shrink-0">
                {/* This button now does EVERYTHING!
                  - {...listeners} makes it the drag handle (on press-and-hold).
                  - onClick={...} opens the menu (on a simple click).
                */}
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