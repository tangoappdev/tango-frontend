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


    // --- UPDATED: Logic for the tag ---
    // This function now returns the abbreviated (M) or (V)
    const getTagInfo = (type) => {
        if (type === 'Vals') {
            return { text: '(V)', style: 'text-[#25edda]' };
        }
        if (type === 'Milonga') {
            return { text: '(M)', style: 'text-[#25edda]' };
        }
        // Return null for "Tango" so no tag is shown.
        return null;
    };


    const tagInfo = getTagInfo(tanda.type);
    // --- END: Update ---


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
                {/* --- REVERTED: The container no longer has flex-nowrap --- */}
                <div className="flex items-center gap-2">
                    {/* --- REVERTED: The orchestra name no longer has min-w-0 --- */}
                    <p className="text-white font-medium truncate">{tanda.orchestra}</p>
                   
                    {/* --- UPDATED: Renders the new (M) or (V) tag --- */}
                    {tagInfo && (
                        <span className={`text-s font-semibold ${tagInfo.style}`}>
                            {tagInfo.text}
                        </span>
                    )}
                    {/* --- END: Update --- */}


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



