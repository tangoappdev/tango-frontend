'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { EllipsisVerticalIcon, PlayCircleIcon } from '@heroicons/react/24/solid';

export default function QueueItem({ tanda, onMenuOpen, onPlayNow, isDesktop, sortableId: sortableIdProp }) {
  const sortableId = sortableIdProp ?? tanda?.id ?? 'queue-item-placeholder';

  const { attributes, listeners, setNodeRef, activatorAttributes, transform, transition, isDragging } =
    useSortable({ id: sortableId });

  if (!tanda) return null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (onPlayNow) onPlayNow(tanda);
  };

  const getTagInfo = (type) => {
    if (type === 'Vals') return { text: '(V)', style: 'text-[#25edda]' };
    if (type === 'Milonga') return { text: '(M)', style: 'text-[#25edda]' };
    return null;
  };

  const tagInfo = getTagInfo(tanda.type);
  const handleActivatorPointerDown = (event) => {
    console.log('QueueItem: handleActivatorPointerDown', { tandaId: tanda.id, pointerType: event.pointerType });
    if (event.pointerType === 'touch') {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    listeners.onPointerDown?.(event);
    activatorAttributes?.onPointerDown?.(event);
  };
  const handleActivatorPointerUp = (event) => {
    console.log('QueueItem: handleActivatorPointerUp', { tandaId: tanda.id, pointerType: event.pointerType });
    if (event.pointerType === 'touch') {
      event.preventDefault();
      event.stopPropagation();
      onMenuOpen(event, tanda);
    }
    listeners.onPointerUp?.(event);
    activatorAttributes?.onPointerUp?.(event);
  };
  const handleActivatorClick = (event) => {
    console.log('QueueItem: handleActivatorClick', { tandaId: tanda.id });
    onMenuOpen(event, tanda);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => { if (!isDesktop && onPlayNow) onPlayNow(tanda); }}
      className="group flex items-center p-2 rounded-md hover:bg-white/10"
    >
      <div className="relative w-12 h-12 object-cover rounded-md flex-shrink-0">
        <Image
          src={tanda.artwork_signed || '/default-artwork.png'}
          alt={`Artwork for ${tanda.orchestra}`}
          fill
          sizes="48px"
          className="object-cover rounded-md"
          unoptimized
        />
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
          {tagInfo && <span className={`text-s font-semibold ${tagInfo.style}`}>{tagInfo.text}</span>}
        </div>
        <p className="text-gray-400 text-sm truncate">{tanda.singer || 'Instrumental'}</p>
      </div>

      <div className="flex-shrink-0">
        <button
          data-panel-no-drag
          {...listeners}          
          onClick={handleActivatorClick}
          className="p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-full cursor-grab"
          title="Click for options, press and hold to drag"
        >
          <EllipsisVerticalIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
