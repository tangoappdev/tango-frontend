'use client';

import React, { useRef } from 'react';
import { motion, useAnimation, useDragControls } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import QueueItem from './QueueItem';

// This component will render the currently playing track in the header of the full-screen queue
function NowPlayingHeader({ tanda, trackIndex }) {
    if (!tanda) return null;
    const currentTrack = tanda.tracks_signed?.[trackIndex];
    return (
        <div className="flex items-center p-4 bg-[#222429]">
            <img
                src={tanda.artwork_signed || '/default-artwork.png'}
                alt={`Artwork for ${tanda.orchestra}`}
                className="w-12 h-12 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-grow mx-3 overflow-hidden">
                <p className="text-white font-medium truncate">{currentTrack?.title || '...'}</p>
                <p className="text-gray-400 text-sm truncate">{tanda.orchestra}</p>
            </div>
        </div>
    );
}


export default function ResponsiveQueue({
    isOpen,
    onClose,
    isMobile,
    manualQueue,
    upcomingPlaylist,
    handleDragEnd,
    handleMenuOpen,
    currentTanda,
    currentTrackIndex
}) {
    const controls = useAnimation();
    const dragControls = useDragControls();
    const constraintsRef = useRef(null);

    const manualQueueIds = manualQueue.map(t => t.id);
    const upcomingPlaylistIds = upcomingPlaylist.map(t => t.id);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // Animate the queue to different states (hidden, partial, full)
    const animateTo = (state) => {
        if (state === 'hidden') controls.start({ y: '100%' });
        if (state === 'partial') controls.start({ y: '50%' });
        if (state === 'full') controls.start({ y: '0%' });
    };

    // Handle drag gestures on the queue sheet
    const handleDrag = (event, info) => {
        const isDraggingDown = info.velocity.y > 20;
        const isDraggingUp = info.velocity.y < -20;
        const currentY = info.point.y;
        const screenHeight = window.innerHeight;

        if (currentY > screenHeight * 0.75 && isDraggingDown) {
            animateTo('hidden');
            onClose();
        } else if (currentY < screenHeight * 0.25 && isDraggingUp) {
            animateTo('full');
        }
    };

    // Handle drag end to snap to the nearest state
    const handleDragEndAnimation = (event, info) => {
        const currentY = info.point.y;
        const screenHeight = window.innerHeight;
        if (currentY > screenHeight * 0.6) {
            animateTo('hidden');
            onClose();
        } else if (currentY > screenHeight * 0.3) {
            animateTo('partial');
        } else {
            animateTo('full');
        }
    };

    // Trigger animations when the isOpen prop changes
    React.useEffect(() => {
        if (isOpen) {
            animateTo('partial');
        } else {
            animateTo('hidden');
        }
    }, [isOpen]);


    // RENDER LOGIC
    if (isMobile) {
        // --- MOBILE BOTTOM SHEET ---
        return (
            <>
                {/* Backdrop overlay */}
                {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-50 z-40" />}
                
                <motion.div
                    ref={constraintsRef}
                    className="fixed bottom-0 left-0 right-0 h-full bg-[#30333a] z-50 flex flex-col"
                    initial={{ y: '100%' }}
                    animate={controls}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    drag="y"
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEndAnimation}
                >
                    {/* Draggable Header */}
                    <div onPointerDown={(e) => dragControls.start(e)} className="w-full cursor-grab p-4 flex justify-center">
                        <div className="w-10 h-1.5 bg-gray-500 rounded-full" />
                    </div>

                    {/* Fixed "Now Playing" Header for full screen view */}
                    <NowPlayingHeader tanda={currentTanda} trackIndex={currentTrackIndex} />

                    {/* Scrollable Queue List */}
                    <div className="flex-grow overflow-y-auto p-2">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={[...manualQueueIds, ...upcomingPlaylistIds]} strategy={verticalListSortingStrategy}>
                                {manualQueue.map(tanda => <QueueItem key={tanda.id} tanda={tanda} onMenuOpen={handleMenuOpen} />)}
                                {manualQueue.length > 0 && upcomingPlaylist.length > 0 && (
                                    <div className="p-2 my-2 border-b border-t border-white/10"><p className="text-xs text-center text-gray-400 font-semibold uppercase">Up Next</p></div>
                                )}
                                {upcomingPlaylist.map(tanda => <QueueItem key={tanda.id} tanda={tanda} onMenuOpen={handleMenuOpen} />)}
                            </SortableContext>
                        </DndContext>
                    </div>
                </motion.div>
            </>
        );
    } else {
        // --- DESKTOP SIDE DRAWER ---
        return (
            <motion.div
                className="w-96 bg-[#222429] p-4 flex-shrink-0 flex flex-col"
                initial={{ x: '100%' }}
                animate={{ x: isOpen ? '0%' : '100%' }}
                transition={{ type: 'tween', ease: 'easeInOut' }}
            >
                <h3 className="text-lg font-semibold text-center text-gray-300 p-2">Queue</h3>
                <div className="flex-grow overflow-y-auto">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={[...manualQueueIds, ...upcomingPlaylistIds]} strategy={verticalListSortingStrategy}>
                            {manualQueue.map(tanda => <QueueItem key={tanda.id} tanda={tanda} onMenuOpen={handleMenuOpen} />)}
                            {manualQueue.length > 0 && upcomingPlaylist.length > 0 && (
                                <div className="p-2 my-2 border-b border-t border-white/10"><p className="text-xs text-center text-gray-400 font-semibold uppercase">Up Next</p></div>
                            )}
                            {upcomingPlaylist.map(tanda => <QueueItem key={tanda.id} tanda={tanda} onMenuOpen={handleMenuOpen} />)}
                        </SortableContext>
                    </DndContext>
                </div>
            </motion.div>
        );
    }
}
