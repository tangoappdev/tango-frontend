'use client';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';

export default function LikedCortinaItem({ item, onMenuOpen, sortableId, isDragOverlay = false }) {
  // Ensure the ID is always a valid string, falling back to the item's key if the prop is missing.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId || item.key,
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="p-3 border-t border-b border-white/5 text-sm select-none flex items-center gap-2"
    >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-semibold text-white whitespace-nowrap">{item.title}</p>
            {item.artist && (<p className="text-xs text-gray-400 truncate">- {item.artist}</p>)}
          </div>
          <p className="text-[11px] uppercase tracking-wide text-[#25edda] mt-1">Cortina - {item.genre || 'Unknown Genre'}</p>
        </div>
        <button
          data-no-dnd="true"
          onClick={(e) => {
            e.preventDefault();
            onMenuOpen?.(e, item);
          }}
          className="p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-full cursor-grab"
          title="Click for options"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
    </div>
  );
}