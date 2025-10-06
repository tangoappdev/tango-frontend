'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { useRef } from 'react';
import { EllipsisVerticalIcon, PlayCircleIcon } from '@heroicons/react/24/solid';
const NowPlayingIcon = () => (
  <svg
    className="h-4 w-4 flex-shrink-0 text-[#25edda]"
    viewBox="0 0 24 24"
    fill="none"
    role="img"
    aria-hidden="true"
  >
    <path d="M4 10v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M7 7v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M10 4v15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M13 7v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M16 10v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M19 7v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);



export default function QueueItem({ tanda, onMenuOpen, onPlayNow, isDesktop, sortableId: sortableIdProp, isActive = false, isDragOverlay = false }) {
  const sortableId = sortableIdProp ?? tanda?.id ?? 'queue-item-placeholder';

  const { attributes, listeners, setNodeRef, activatorAttributes, transform, transition, isDragging } =
    useSortable({ id: sortableId, disabled: isDragOverlay });

  const tapStartRef = useRef(null);
  const TAP_THRESHOLD_MS = 200;

  if (!tanda) return null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const containerClasses = `group flex items-center p-2 mb-1 rounded-md transition-colors duration-200 ${isActive ? 'bg-[#25edda]/10' : 'border-transparent hover:bg-white/10'}`;
  const orchestraClasses = `font-medium truncate ${isActive ? 'text-[#25edda]' : 'text-white'}`;
  const detailsClasses = `text-sm truncate ${isActive ? 'text-gray-300' : 'text-gray-400'}`;

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
    tapStartRef.current = { time: Date.now(), x: event.clientX, y: event.clientY };
    listeners.onPointerDown?.(event);
  };

  const handleActivatorPointerUp = (event) => {
    if (tapStartRef.current) {
      const { time, x, y } = tapStartRef.current;
      const duration = Date.now() - time;
      const distance = Math.sqrt(Math.pow(event.clientX - x, 2) + Math.pow(event.clientY - y, 2));
      if (duration < TAP_THRESHOLD_MS && distance < 5) {
        onMenuOpen(event, tanda);
      }
    }
    tapStartRef.current = null;
    listeners.onPointerUp?.(event);
  };

  const handleActivatorClick = (event) => {
    if (event.pointerType !== 'touch') {
      event.preventDefault();
      event.stopPropagation();
      onMenuOpen(event, tanda);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => { if (!isDesktop && onPlayNow) onPlayNow(tanda); }}
      className={containerClasses}
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
          {isActive && (
            <NowPlayingIcon />
          )}
          <p className={orchestraClasses}>{tanda.orchestra}</p>
          {tagInfo && <span className={`text-s font-semibold ${tagInfo.style}`}>{tagInfo.text}</span>}
        </div>
        <p className={detailsClasses}>{tanda.singer || 'Instrumental'}</p>
      </div>

      <div className="flex-shrink-0">
        <button
          data-panel-no-drag
          onPointerDown={handleActivatorPointerDown}
          onClick={handleActivatorClick}
          onPointerUp={handleActivatorPointerUp}
          className="p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-full cursor-grab"
          title="Click for options, press and hold to drag"
        >
          <EllipsisVerticalIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
