'use client';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';

export default function CortinaRow({ item, sortableId: sortableIdProp, isActive, onMenuOpen, isDragOverlay = false }) {
  const sortableId = sortableIdProp ?? item?.sortableId ?? item?.key;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  const containerClasses = `p-3 border-b border-white/5 text-sm space-y-1 ${isActive ? 'bg-[#25edda]/10 border-[#25edda]/40' : ''}`;
  const orderClasses = `text-xs font-semibold ${isActive ? 'text-[#25edda]' : 'text-gray-400'}`;
  return (
    <div
      ref={setNodeRef}
      data-panel-no-drag
      {...attributes}
      {...listeners}
      style={style}
      className={`${containerClasses} select-none flex items-center gap-2`}
    >
      <span className={orderClasses}>#{item.order}</span>
      <div className="flex flex-1 items-baseline gap-2 min-w-0">
        <span className="text-sm text-white whitespace-nowrap">{item.title}</span>
        {item.artist && (
          <span className="text-xs text-gray-400 truncate">- {item.artist}</span>
        )}
      </div>
      <button
        data-no-dnd="true"
        onClick={(e) => {
          e.preventDefault();
          onMenuOpen?.(e, item);
        }}
        className="p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-full cursor-grab"
        title="Click for options, press and hold to drag"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
