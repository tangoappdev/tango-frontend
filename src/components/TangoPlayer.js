'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import QueueItem from './QueueItem';
import ContextMenu from './ContextMenu';
import {
    PlayIcon, PauseIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
    ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, AdjustmentsVerticalIcon,
    SparklesIcon, QueueListIcon
} from '@heroicons/react/24/outline';


// --- Unified Queue Component (for Mobile Bottom Sheet) ---
function Queue({
    isOpen,
    onClose,
    isDesktop,
    ...props
}) {
    const panelRef = useRef(null);
    const touchStartY = useRef(0);
    const touchMoveY = useRef(0);
    const isDraggingPanel = useRef(false);

    const handleTouchStart = (e) => {
        if (isDesktop) return;
        touchStartY.current = e.targetTouches[0].clientY;
        touchMoveY.current = touchStartY.current;
        isDraggingPanel.current = props.queueContainerRef.current?.scrollTop === 0;
    };

    const handleTouchMove = (e) => {
        if (isDesktop || !isDraggingPanel.current) return;
        touchMoveY.current = e.targetTouches[0].clientY;
        const deltaY = touchMoveY.current - touchStartY.current;
        if (deltaY > 0) {
            e.preventDefault();
            if (panelRef.current) {
                panelRef.current.style.transform = `translateY(${deltaY}px)`;
                panelRef.current.style.transition = 'none';
            }
        } else {
            isDraggingPanel.current = false;
        }
    };

    const handleTouchEnd = () => {
        if (isDesktop) return;
        const deltaY = touchMoveY.current - touchStartY.current;
        if (isDraggingPanel.current && deltaY > 50) {
            onClose();
        }
        if (panelRef.current) {
            panelRef.current.style.transform = '';
            panelRef.current.style.transition = '';
        }
        touchStartY.current = 0;
        touchMoveY.current = 0;
        isDraggingPanel.current = false;
    };
    
    const containerClasses = `
        lg:relative lg:transition-all lg:duration-500 lg:ease-in-out
        ${isOpen ? 'lg:w-100 lg:ml-4' : 'lg:w-0 lg:ml-0'}
       
        fixed inset-0 z-10
        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        lg:opacity-100 lg:pointer-events-auto
    `;

    return (
        <div className={containerClasses}>
            {/* Mobile-only backdrop */}
            <div className="absolute inset-0 bg-black/60 lg:hidden" onClick={onClose}></div>
            
            <div
                ref={panelRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`
                    bg-[#30333a] shadow-2xl lg:shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b] flex flex-col
                    transition-all duration-500 ease-in-out
                    
                    ${/* Mobile panel styles */''}
                    absolute bottom-0 left-0 right-0 w-full max-w-[28rem] mx-auto h-[70%] rounded-t-2xl transform
                    ${isOpen ? 'translate-y-0' : 'translate-y-full'}

                    ${/* Desktop panel styles (These are from the old layout, they won't be used in the new 3-column layout but are harmless to keep) */''}
                    lg:relative lg:h-full lg:w-full lg:rounded-lg lg:transform-none lg:mx-0
                    lg:transition-opacity ${isOpen ? 'lg:opacity-100' : 'lg:opacity-0' }
                `}
            >
                {/* Mobile-only handle */}
                <div className="w-12 h-1.5 bg-gray-500 rounded-full mx-auto my-3 flex-shrink-0 lg:hidden"></div>
                
                <div className={`flex flex-col h-full overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <QueueContent {...props} />
                </div>
            </div>
        </div>
    );
}


// --- Shared QueueContent Component ---
function QueueContent({
    manualQueue,
    upcomingPlaylist,
    manualQueueIds,
    upcomingPlaylistIds,
    handleDragEnd,
    handleQueueScroll,
    queueContainerRef,
    sensors,
    onMenuOpen
}) {
    return (
        <>
            <div
                ref={queueContainerRef}
                onScroll={handleQueueScroll}
                className="flex-grow overflow-y-auto px-2 h-full"
            >
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
                    <SortableContext
                        items={[...manualQueueIds, ...upcomingPlaylistIds]}
                        strategy={verticalListSortingStrategy}
                    >
                        {manualQueue.map((tanda) => (
                            <QueueItem key={tanda.id} tanda={tanda} onMenuOpen={onMenuOpen} />
                        ))}

                        {manualQueue.length > 0 && upcomingPlaylist.length > 0 && (
                            <div className="p-2 my-2 border-b border-t border-white/10">
                                <p className="text-xs text-center text-gray-400 font-semibold uppercase">Up Next from Playlist</p>
                            </div>
                        )}

                        {upcomingPlaylist.map((tanda) => (
                            <QueueItem key={tanda.id} tanda={tanda} onMenuOpen={onMenuOpen} />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </>
    );
}


// --- Constants ---
const API_BASE_URL = '/api';
const CATEGORIES = {
    TRADITIONAL_GOLDEN_AGE: "Traditional (Golden Age)",
    CONTEMPORARY_TRADITIONAL: "Contemporary Traditional",
    ALTERNATIVE: "Alternative / Alternativo"
};
const TANDA_SEQUENCES = {
    '2TV2TM': ['Tango', 'Tango', 'Vals', 'Tango', 'Tango', 'Milonga'],
    '3TV3TM': ['Tango', 'Tango', 'Tango', 'Vals', 'Tango', 'Tango', 'Tango', 'Milonga'],
    'Just Tango': ['Tango'],
    'Just Vals': ['Vals'],
    'Just Milonga': ['Milonga'],
};
const TANDA_ORDER_OPTIONS = Object.keys(TANDA_SEQUENCES).map(key => ({ value: key, label: key }));
const ORCHESTRA_TYPE_OPTIONS = Object.values(CATEGORIES).map(cat => ({ value: cat, label: cat }));
const TANDA_LENGTH_OPTIONS = [3, 4];
const FREESTYLE_FETCH_BATCH_SIZE = 6;
const PLAYLIST_REFILL_THRESHOLD = 5;


const initialSettings = {
    categoryFilter: CATEGORIES.TRADITIONAL_GOLDEN_AGE,
    tandaLength: 4,
    tandaOrder: '2TV2TM',
    cortinas: true,
};


function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}


export default function TangoPlayer() {
    const [settings, setSettings] = useState(initialSettings);
    const [upcomingPlaylist, setUpcomingPlaylist] = useState([]);
    const [manualQueue, setManualQueue] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recentlyPlayedIds, setRecentlyPlayedIds] = useState(new Set());
    const [tandaHistory, setTandaHistory] = useState([]);
    const [resetCounter, setResetCounter] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [activeLeftPanel, setActiveLeftPanel] = useState('settings'); // For Desktop
    const [activePanel, setActivePanel] = useState(null); // For Mobile
    const [eq, setEq] = useState({ low: 0, mid: 0, high: 0 });
    const [menuState, setMenuState] = useState({
        visible: false,
        x: 0,
        y: 0,
        tandaId: null,
    });
    const [eqNotification, setEqNotification] = useState('');
    const [isDesktop, setIsDesktop] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    const audioRef = useRef(null);
    const queueContainerRef = useRef(null);
    const autoplayIntentRef = useRef(false);
    const isFetchingRef = useRef(false);
    const isSeekingRef = useRef(false);
    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const lowShelfRef = useRef(null);
    const midPeakingRef = useRef(null);
    const highShelfRef = useRef(null);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            delay: 250,
            tolerance: 5,
        },
    }));
    
    useEffect(() => {
        setHasMounted(true);
        const mediaQuery = window.matchMedia('(min-width: 1024px)');
        const handleChange = () => setIsDesktop(mediaQuery.matches);
        handleChange();
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);
    
    const currentTanda = useMemo(() => manualQueue.length > 0 ? manualQueue[0] : upcomingPlaylist[0] || null, [manualQueue, upcomingPlaylist]);
    const manualQueueIds = useMemo(() => manualQueue.map(t => t.id), [manualQueue]);
    const upcomingPlaylistIds = useMemo(() => upcomingPlaylist.map(t => t.id), [upcomingPlaylist]);


    const fetchAndFillPlaylist = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setIsLoading(true);


        const allExcludeIds = new Set([...recentlyPlayedIds, ...upcomingPlaylist.map(t => t.id)]);
        const params = new URLSearchParams({
            categoryFilter: settings.categoryFilter,
            excludeIds: Array.from(allExcludeIds).join(','),
        });


        if (settings.tandaOrder.startsWith('Just')) {
            params.append('requiredType', TANDA_SEQUENCES[settings.tandaOrder][0]);
            params.append('limit', FREESTYLE_FETCH_BATCH_SIZE);
        } else {
            params.append('tandaOrder', settings.tandaOrder);
        }

        const apiUrl = `${API_BASE_URL}/tandas/preview?${params.toString()}`;


        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Failed to fetch playlist from server.');
            const data = await response.json();

            if (data.upcomingTandas && data.upcomingTandas.length > 0) {
                setUpcomingPlaylist(prev => {
                    const combined = [...prev, ...data.upcomingTandas];
                    const unique = combined.filter((tanda, index, self) => index === self.findIndex((t) => (t.id === tanda.id)));
                    return unique;
                });
                setError(null);
            }
        } catch (err) {
            console.error("FETCH ERROR:", err);
            setError(err.message);
        } finally {
            isFetchingRef.current = false;
            setIsLoading(false);
        }
    }, [settings, recentlyPlayedIds, upcomingPlaylist]);


    const playNextTanda = useCallback(() => {
        const sourceTanda = manualQueue.length > 0 ? manualQueue[0] : upcomingPlaylist[0];
        if (!sourceTanda) { fetchAndFillPlaylist(); return; }

        setTandaHistory(prev => [sourceTanda, ...prev].slice(0, 50));
        setRecentlyPlayedIds(prev => new Set(prev).add(sourceTanda.id));
        setCurrentTrackIndex(0);
        autoplayIntentRef.current = true;

        if (manualQueue.length > 0) {
            setManualQueue(prev => prev.slice(1));
        } else {
            setUpcomingPlaylist(prev => prev.slice(1));
        }
    }, [manualQueue, upcomingPlaylist, fetchAndFillPlaylist]);


    const handleQueueScroll = useCallback(() => {
        if (queueContainerRef.current && !isFetchingRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = queueContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
            if (isNearBottom) {
                fetchAndFillPlaylist();
            }
        }
    }, [fetchAndFillPlaylist]);


    useEffect(() => {
        if (resetCounter > 0) {
            setUpcomingPlaylist([]);
            setManualQueue([]);
            setRecentlyPlayedIds(new Set());
        }
    }, [resetCounter]);


    useEffect(() => {
        const needsFetching = upcomingPlaylist.length === 0 || upcomingPlaylist.length < PLAYLIST_REFILL_THRESHOLD;
        if (needsFetching && !isFetchingRef.current) {
            fetchAndFillPlaylist();
        }
    }, [upcomingPlaylist.length, resetCounter, fetchAndFillPlaylist]);


    useEffect(() => {
        const trackUrl = currentTanda?.tracks_signed?.[currentTrackIndex]?.url_signed;
        if (trackUrl && audioRef.current && audioRef.current.src !== trackUrl) {
            audioRef.current.src = trackUrl;
            audioRef.current.load();
            if (autoplayIntentRef.current) {
                autoplayIntentRef.current = false;
                audioRef.current.play().catch(e => setIsPlaying(false));
            }
        }
    }, [currentTanda, currentTrackIndex]);

    const initAudioGraph = useCallback(() => {
        if (!isDesktop || audioContextRef.current) return;


        const context = new (window.AudioContext || window.webkitAudioContext)();
        if (!audioRef.current) return;
        const source = context.createMediaElementSource(audioRef.current);
        const lowShelf = context.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 320;
        lowShelf.gain.value = eq.low;
        const midPeaking = context.createBiquadFilter();
        midPeaking.type = 'peaking';
        midPeaking.frequency.value = 1000;
        midPeaking.Q.value = 1;
        midPeaking.gain.value = eq.mid;
        const highShelf = context.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 3200;
        highShelf.gain.value = eq.high;
        source.connect(lowShelf);
        lowShelf.connect(midPeaking);
        midPeaking.connect(highShelf);
        highShelf.connect(context.destination);
        audioContextRef.current = context;
        sourceNodeRef.current = source;
        lowShelfRef.current = lowShelf;
        midPeakingRef.current = midPeaking;
        highShelfRef.current = highShelf;
    }, [eq.low, eq.mid, eq.high, isDesktop]);


    const handleSettingChange = (settingName, value) => {
        setSettings(prev => ({ ...prev, [settingName]: value }));
        setResetCounter(c => c + 1);
    };


    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;


        const isActiveInManual = manualQueueIds.includes(active.id);
        const isOverInManual = manualQueueIds.includes(over.id);
        const draggedTanda = [...manualQueue, ...upcomingPlaylist].find(t => t.id === active.id);


        if (!draggedTanda) return;


        if (isActiveInManual && isOverInManual) {
            setManualQueue((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
        else if (!isActiveInManual && isOverInManual) {
            setUpcomingPlaylist(prev => prev.filter(t => t.id !== active.id));
            setManualQueue(items => {
                const newIndex = items.findIndex(item => item.id === over.id);
                const newItems = [...items];
                newItems.splice(newIndex, 0, draggedTanda);
                return newItems;
            });
        }
    };


    const handlePlayNext = (tandaToPlayNext) => {
        if (!currentTanda || currentTanda.id === tandaToPlayNext.id) {
            if (!currentTanda) {
                handleAddToQueue(tandaToPlayNext);
            }
            return;
        }
        let newManualQueue = [...manualQueue];
        let newUpcomingPlaylist = [...upcomingPlaylist];
        newManualQueue = newManualQueue.filter(t => t.id !== tandaToPlayNext.id);
        newUpcomingPlaylist = newUpcomingPlaylist.filter(t => t.id !== tandaToPlayNext.id);
        const currentTandaIndexInManual = newManualQueue.findIndex(t => t.id === currentTanda.id);


        if (currentTandaIndexInManual !== -1) {
            newManualQueue.splice(currentTandaIndexInManual + 1, 0, tandaToPlayNext);
        } else {
            newUpcomingPlaylist = newUpcomingPlaylist.filter(t => t.id !== currentTanda.id);
            newManualQueue = [currentTanda, tandaToPlayNext, ...newManualQueue];
        }
        setManualQueue(newManualQueue);
        setUpcomingPlaylist(newUpcomingPlaylist);
    };


    const handleAddToQueue = (tandaToAdd) => {
        if (manualQueue.some(t => t.id === tandaToAdd.id)) {
            return;
        }
        let newManualQueue = [...manualQueue];
        let newUpcomingPlaylist = [...upcomingPlaylist];
        newUpcomingPlaylist = newUpcomingPlaylist.filter(t => t.id !== tandaToAdd.id);


        if (newManualQueue.length > 0) {
            newManualQueue.push(tandaToAdd);
        } else {
            if (currentTanda) {
                newUpcomingPlaylist = newUpcomingPlaylist.filter(t => t.id !== currentTanda.id);
                if (currentTanda.id === tandaToAdd.id) {
                    newManualQueue = [currentTanda];
                } else {
                    newManualQueue = [currentTanda, tandaToAdd];
                }
            } else {
                newManualQueue = [tandaToAdd];
            }
        }
        setManualQueue(newManualQueue);
        setUpcomingPlaylist(newUpcomingPlaylist);
    };


    const handleTrackEnded = useCallback(() => {
        const totalTracks = currentTanda?.tracks_signed?.length || 0;
        const lengthRule = (currentTanda?.type === 'Tango') ? settings.tandaLength : 3;
        if (currentTrackIndex < Math.min(totalTracks, lengthRule) - 1) {
            autoplayIntentRef.current = true;
            setCurrentTrackIndex(prev => prev + 1);
        } else {
            playNextTanda();
        }
    }, [currentTanda, currentTrackIndex, settings.tandaLength, playNextTanda]);


    const handleSkipForward = useCallback(() => {
        if (!currentTanda) return;
        const totalTracks = currentTanda.tracks_signed?.length || 0;
        const effectiveLength = (currentTanda.type === 'Tango') ? settings.tandaLength : 3;
        if (currentTrackIndex < Math.min(totalTracks, effectiveLength) - 1) {
            setCurrentTrackIndex(prev => prev + 1);
            autoplayIntentRef.current = isPlaying;
        } else {
            playNextTanda();
        }
    }, [currentTanda, currentTrackIndex, settings.tandaLength, isPlaying, playNextTanda]);


    const handlePlay = useCallback(async () => {
        if (!audioContextRef.current && isDesktop) {
            initAudioGraph();
        }

        const audioCtx = audioContextRef.current;
        if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }


        if (audioRef.current?.src && audioRef.current.paused) {
            try {
                await audioRef.current.play();
            } catch (e) {
                console.error("Play failed:", e);
                setIsPlaying(false);
            }
        } else if (!currentTanda && !isLoading) {
            fetchAndFillPlaylist();
        }
    }, [currentTanda, isLoading, fetchAndFillPlaylist, isDesktop, initAudioGraph]);

    const handlePause = useCallback(() => {
        if (audioRef.current) audioRef.current.pause();
    }, []);

    const handleSkipBackward = useCallback(() => {
        if (!currentTanda || !audioRef.current) return;
        const RESTART_THRESHOLD_SECONDS = 3;
        if (audioRef.current.currentTime > RESTART_THRESHOLD_SECONDS || currentTrackIndex === 0) {
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
        } else {
            setCurrentTrackIndex(prevIndex => prevIndex - 1);
            autoplayIntentRef.current = isPlaying;
        }
    }, [currentTanda, currentTrackIndex, isPlaying]);


    const handleRewind = useCallback(() => {
        if (tandaHistory.length === 0) {
            return;
        }
        const previousTanda = tandaHistory[0];
        const newHistory = tandaHistory.slice(1);
        setTandaHistory(newHistory);
        const fullForwardQueue = [...manualQueue, ...upcomingPlaylist];
        const newQueue = [
            currentTanda,
            ...fullForwardQueue.filter(t => t.id !== currentTanda?.id)
        ].filter(Boolean);
        setManualQueue([previousTanda, ...newQueue]);
        setUpcomingPlaylist([]);
        setCurrentTrackIndex(0);
        autoplayIntentRef.current = isPlaying;
    }, [tandaHistory, currentTanda, manualQueue, upcomingPlaylist, isPlaying]);

    useEffect(() => {
        const currentTrack = currentTanda?.tracks_signed?.[currentTrackIndex];


        if ('mediaSession' in navigator && currentTanda && currentTrack) {
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: currentTrack.title,
                artist: currentTanda.orchestra,
                album: `${currentTanda.singer || 'Instrumental'} - ${currentTanda.type}`,
                artwork: [
                    { src: currentTanda.artwork_signed, sizes: '512x512', type: 'image/jpeg' },
                ]
            });


            navigator.mediaSession.setActionHandler('play', handlePlay);
            navigator.mediaSession.setActionHandler('pause', handlePause);
            navigator.mediaSession.setActionHandler('previoustrack', handleSkipBackward);
            navigator.mediaSession.setActionHandler('nexttrack', handleSkipForward);
        }
    }, [currentTanda, currentTrackIndex, handlePlay, handlePause, handleSkipBackward, handleSkipForward]);


    const handlePanelToggle = (panelName) => {
        const isOpening = activePanel !== panelName;
        if (panelName === 'queue' && isOpening) {
            fetchAndFillPlaylist();
        }
        setActivePanel(prev => prev === panelName ? null : panelName);
    };

    const handleEqChange = useCallback((band, value) => {
        if (!isDesktop) {
            setEqNotification('Equalizer is available on desktop only.');
            setTimeout(() => setEqNotification(''), 3000);
            return;
        }
        const gainValue = parseFloat(value);
        setEq(prevEq => ({ ...prevEq, [band]: gainValue }));
        const audioCtx = audioContextRef.current;
        if (!audioCtx) return;
        if (band === 'low' && lowShelfRef.current) lowShelfRef.current.gain.setTargetAtTime(gainValue, audioCtx.currentTime, 0.01);
        if (band === 'mid' && midPeakingRef.current) midPeakingRef.current.gain.setTargetAtTime(gainValue, audioCtx.currentTime, 0.01);
        if (band === 'high' && highShelfRef.current) highShelfRef.current.gain.setTargetAtTime(gainValue, audioCtx.currentTime, 0.01);
    }, [isDesktop]);


    const handleMenuOpen = useCallback((event, tanda) => {
        event.preventDefault();
        event.stopPropagation();
        setMenuState({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            tandaId: tanda.id,
        });
    }, []);


    const handleMenuClose = useCallback(() => {
        setMenuState(prev => ({ ...prev, visible: false }));
    }, []);


    const handleMenuAction = useCallback((action) => {
        const tanda = [...manualQueue, ...upcomingPlaylist].find(t => t.id === menuState.tandaId);
        if (tanda) {
            action(tanda);
        }
        handleMenuClose();
    }, [manualQueue, upcomingPlaylist, menuState.tandaId, handleMenuClose, handlePlayNext, handleAddToQueue]);


    const handleSeek = (event) => { if (audioRef.current?.duration) { const seekTime = Number(event.target.value); audioRef.current.currentTime = seekTime; setCurrentTime(seekTime); } };
    const handleProgressClick = useCallback((event) => { if (!audioRef.current || !duration) return; const barElement = event.currentTarget; const rect = barElement.getBoundingClientRect(); const clickX = event.clientX - rect.left; const seekTime = (clickX / rect.width) * duration; audioRef.current.currentTime = seekTime; setCurrentTime(seekTime); }, [duration]);
    const handleSeekingStart = () => { isSeekingRef.current = true; };
    const handleSeekingEnd = () => { isSeekingRef.current = false; };
    const handleVolumeChange = (event) => { if (event.target) { const newVolume = Number(event.target.value); setVolume(newVolume); if (audioRef.current) audioRef.current.volume = newVolume; } };
    const renderVerticalVolumeSlider = (currentVolume, setVolumeFunctionCallback) => { const volumePercentage = currentVolume * 100; const KNOB_DISPLAY_HEIGHT_PX = 12; const thumbOffsetPx = KNOB_DISPLAY_HEIGHT_PX / 2; const thumbTopPosition = `calc(${(1 - currentVolume) * 100}% - ${thumbOffsetPx}px)`; return (<div className="flex flex-col items-center justify-center h-48 w-16 bg-[url('/images/volumeback.png')] bg-contain bg-no-repeat bg-center p-1 rounded-md shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]"><div className="relative w-1 h-[80%] bg-[#222429] rounded-full shadow-inner cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const clickY = e.clientY - rect.top; let newVolume = Math.max(0, Math.min(1, 1 - (clickY / rect.height))); setVolumeFunctionCallback({ target: { value: newVolume.toString() } }); }}><div className="absolute bottom-0 left-0 w-full bg-[#25edda] rounded-b-full pointer-events-none" style={{ height: `${volumePercentage}%` }} /><div className="absolute left-1/2 -translate-x-1/2 w-8 h-3 rounded-md bg-[#30333a] shadow-[3px_3px_3px_#222429,-3px_-3px_3px_#3e424b] pointer-events-none" style={{ top: thumbTopPosition }} /><input type="range" min="0" max="1" step="0.01" value={currentVolume} onChange={setVolumeFunctionCallback} className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }} aria-label="Volume" /></div></div>); };
    const handleAudioTimeUpdate = useCallback(() => { if (audioRef.current && !isSeekingRef.current) setCurrentTime(audioRef.current.currentTime); }, []);
    const handleAudioLoadedMetadata = useCallback(() => { if (audioRef.current) setDuration(audioRef.current.duration); }, []);
    const handleAudioPlay = useCallback(() => setIsPlaying(true), []);
    const handleAudioPause = useCallback(() => setIsPlaying(false), []);

    if (!hasMounted) {
        return <div className="p-2 sm:p-4">
            <div className="p-4 bg-[#30333a] text-white rounded-lg shadow-lg w-full max-w-[32rem] mx-auto text-center">Loading Player...</div>
        </div>;
    }

    if (!currentTanda && isLoading) {
        return <div className="p-2 sm:p-4">
            <div className="p-4 bg-[#30333a] text-white rounded-lg shadow-lg w-full max-w-[32rem] mx-auto text-center">Loading Music...</div>
        </div>;
    }
    if (!currentTanda && error) {
        return <div className="p-2 sm:p-4">
            <div className="p-4 bg-red-800 text-white rounded-lg shadow-lg w-full max-w-[32rem] mx-auto text-center">Error: {error} <button onClick={() => setResetCounter(c => c + 1)} className="ml-2 px-2 py-1 bg-blue-600 rounded text-white text-sm">Retry</button></div>
        </div>;
    }


    const currentTrackTitle = currentTanda?.tracks_signed?.[currentTrackIndex]?.title || '...';
    const displayTandaLength = currentTanda ? ((currentTanda.type === 'Tango') ? settings.tandaLength : 3) : '?';
    const displayTotalTracks = currentTanda?.tracks_signed?.length || 0;
    
    // --- Restored Original Neumorphic Button Styles ---
    const baseButtonClasses = "rounded-full text-gray-300 transition-all duration-200 ease-in-out shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[inset_5px_5px_10px_#131417,inset_-5px_-5px_10px_#4d525d] hover:text-[#25edda]";
    const regularButtonStyle = `${baseButtonClasses} bg-gradient-[145deg] from-[#33373e] to-[#2b2e34]`;
    const primaryButtonStyle = `${baseButtonClasses} bg-gradient-[145deg] from-[#25edda] to-[#23d9c8] text-white`;
    const playPauseButtonStyle = `${baseButtonClasses} bg-gradient-[145deg] from-[#25edda] to-[#23d9c8] text-white`;

    const queueProps = {
        manualQueue,
        upcomingPlaylist,
        manualQueueIds,
        upcomingPlaylistIds,
        handleDragEnd,
        handleQueueScroll,
        queueContainerRef,
        sensors,
        onMenuOpen: handleMenuOpen,
        isDesktop,
    };

    return (
        // A single container for the whole player
        <div className="w-full h-full font-sans text-white">

            {/* =================================================================== */}
            {/* ====== DESKTOP 3-COLUMN LAYOUT (HIDDEN ON MOBILE) ====== */}
            {/* =================================================================== */}
            <div className="hidden lg:flex justify-center items-center w-full h-full p-4">
                <div className="w-full max-w-7xl h-[600px] bg-[#30333a]/70 backdrop-blur-xl rounded-2xl shadow-2xl p-6 flex gap-6 border border-white/10">

                    {/* ====== COLUMN 1: SETTINGS & EQ (LEFT) ====== */}
                    <div className="w-1/4 flex flex-col bg-black/20 rounded-xl shadow-inner overflow-hidden">
                        <div className="flex-shrink-0 flex items-center justify-center p-2 bg-black/20">
                            <div className="flex items-center space-x-2 bg-gray-900/50 p-1 rounded-full w-full">
                                <button onClick={() => setActiveLeftPanel('settings')} title="Settings" className={`w-1/2 py-1.5 text-sm rounded-full transition-colors duration-300 flex items-center justify-center gap-1 ${activeLeftPanel === 'settings' ? 'bg-[#25edda] text-black font-semibold' : 'text-gray-400 hover:text-white'}`}><AdjustmentsVerticalIcon className="h-5 w-5" /> Settings</button>
                                <button onClick={() => setActiveLeftPanel('eq')} title="Equalizer" className={`w-1/2 py-1.5 text-sm rounded-full transition-colors duration-300 flex items-center justify-center gap-1 ${activeLeftPanel === 'eq' ? 'bg-[#25edda] text-black font-semibold' : 'text-gray-400 hover:text-white'}`}><SparklesIcon className="h-5 w-5" /> EQ</button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4">
                            {activeLeftPanel === 'settings' && (
                               <div>
                                    <h3 className="text-lg font-semibold mb-4 text-center text-gray-300">Player Settings</h3>
                                    <div className="grid grid-cols-1 gap-y-4">
                                        <div><label htmlFor="tandaOrderDesktop" className="block text-sm font-medium text-gray-400 mb-1">Tanda Order</label><div className="relative"><select id="tandaOrderDesktop" name="tandaOrder" value={settings.tandaOrder} onChange={(e) => handleSettingChange('tandaOrder', e.target.value)} className="w-full appearance-none cursor-pointer rounded-full bg-[#30333a] text-white p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]">{TANDA_ORDER_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select><ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none" /></div></div>
                                        <div><label htmlFor="categoryFilterDesktop" className="block text-sm font-medium text-gray-400 mb-1">Orchestra Type</label><div className="relative"><select id="categoryFilterDesktop" name="categoryFilter" value={settings.categoryFilter} onChange={(e) => handleSettingChange('categoryFilter', e.target.value)} className="w-full appearance-none cursor-pointer rounded-full bg-[#30333a] text-white p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]">{ORCHESTRA_TYPE_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select><ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none" /></div></div>
                                        <div><span className="block text-sm font-medium text-gray-400 mb-1">Tanda Length</span><div className="grid grid-cols-2 gap-2 mt-1 w-full">{TANDA_LENGTH_OPTIONS.map(len => (<button key={len} onClick={() => handleSettingChange('tandaLength', len)} className={`py-2 rounded-lg text-sm transition-all duration-200 ease-in-out whitespace-nowrap text-center ${settings.tandaLength === len ? 'text-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]' : 'text-gray-300 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e]'}`}>{len} Tangos</button>))}</div></div>
                                    </div>
                                </div>
                            )}
                            {activeLeftPanel === 'eq' && (
                                <div>
                                   <h3 className="text-lg font-semibold mb-4 text-center text-gray-300">Equalizer</h3>
                                   <div className="flex flex-col space-y-4">
                                        <div className="flex flex-col"><label htmlFor="low-eq-desktop" className="text-sm font-medium text-gray-400">LOW</label><input id="low-eq-desktop" type="range" min="-12" max="12" step="0.1" value={eq.low} onChange={(e) => handleEqChange('low', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent h-2 rounded-lg" /></div>
                                        <div className="flex flex-col"><label htmlFor="mid-eq-desktop" className="text-sm font-medium text-gray-400">MID</label><input id="mid-eq-desktop" type="range" min="-12" max="12" step="0.1" value={eq.mid} onChange={(e) => handleEqChange('mid', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent h-2 rounded-lg" /></div>
                                        <div className="flex flex-col"><label htmlFor="high-eq-desktop" className="text-sm font-medium text-gray-400">HIGH</label><input id="high-eq-desktop" type="range" min="-12" max="12" step="0.1" value={eq.high} onChange={(e) => handleEqChange('high', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent h-2 rounded-lg" /></div>
                                   </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* ====== COLUMN 2: PLAYER (CENTER) ====== */}
                    <div className="w-1/2 flex flex-col">
                        <h2 className="text-2xl font-bold mb-4 text-center text-gray-200">TangoDJ</h2>
                        <div className="flex-grow flex flex-col items-center justify-center gap-6">
                            <div className="flex items-center gap-6">
                                {currentTanda && currentTanda.artwork_signed ? (<img src={currentTanda.artwork_signed} alt={`Artwork for ${currentTanda.orchestra}`} className="w-56 h-56 object-cover rounded-lg shadow-lg" />) : (<div className="w-56 h-56 bg-gray-900/50 rounded-lg shadow-lg flex items-center justify-center text-gray-500">Artwork</div>)}
                                {renderVerticalVolumeSlider(volume, handleVolumeChange)}
                            </div>
                            <div className="text-center min-h-[4em] w-full">
                                {isLoading && !currentTanda && <span className="text-sm text-gray-400 block">Loading Music...</span>}{error && !isLoading && <span className="text-sm text-red-400 block">Error: {error}</span>}
                                {currentTanda ? (<><p className="text-xl truncate font-semibold text-gray-100" title={`${currentTanda.orchestra} - ${currentTanda.singer}`}>{currentTanda.orchestra || 'Unknown Orchestra'}</p><p className="text-base text-gray-400">{currentTanda.singer || 'Instrumental'} - {currentTanda.type || 'Unknown'}</p><p className="text-xs text-gray-500 truncate" title={currentTrackTitle}>Track {currentTrackIndex + 1} / {Math.min(displayTotalTracks, displayTandaLength)}: {currentTrackTitle}</p></>) : (!isLoading && !error && <span className="text-lg text-gray-500">No music loaded.</span>)}
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <audio ref={audioRef} crossOrigin="anonymous" onEnded={handleTrackEnded} preload="auto" className="hidden" onTimeUpdate={handleAudioTimeUpdate} onLoadedMetadata={handleAudioLoadedMetadata} onPlay={handleAudioPlay} onPause={handleAudioPause} onError={(e) => { setError("An audio playback error occurred."); }} />
                            <div className="flex items-center gap-3 mb-3 px-1">
                                <span className="text-xs w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
                                <div className="relative w-full h-2 cursor-pointer group" onClick={handleProgressClick}>
                                    <div className="absolute top-0 left-0 w-full h-full bg-[#222429] rounded-full shadow-[inset_3px_3px_2px_#222429,inset_-3px_-3px_2px_#3e424b]"></div>
                                    <div className="absolute top-0 left-0 h-full bg-[#25edda] rounded-l-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                                    <div className="absolute top-1/2 w-4 h-4 bg-[#30333a] rounded-full shadow-[2px_2px_1px_#222429,-2px_-2px_1px_#3e424b] pointer-events-none" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}></div>
                                    <input type="range" min="0" max={duration || 1} value={currentTime} onMouseDown={handleSeekingStart} onTouchStart={handleSeekingStart} onChange={handleSeek} onMouseUp={handleSeekingEnd} onTouchEnd={handleSeekingEnd} disabled={!currentTanda || duration === 0} className="absolute top-0 left-0 w-full h-full opacity-0 m-0 p-0 cursor-pointer" aria-label="Track progress" />
                                </div>
                                <span className="text-xs w-10 text-left tabular-nums">{formatTime(duration)}</span>
                            </div>
                            <div className="flex justify-center items-center space-x-4 mb-2">
                                <button onClick={handleRewind} title="Previous Tanda" disabled={tandaHistory.length === 0} className={`${regularButtonStyle} p-3`}><ChevronDoubleLeftIcon className="h-5 w-5" /></button>
                                <button onClick={handleSkipBackward} title="Previous Track" disabled={!currentTanda} className={`${regularButtonStyle} p-3`}><ChevronLeftIcon className="h-5 w-5" /></button>
                                <button onClick={isPlaying ? handlePause : handlePlay} disabled={!currentTanda && isLoading} className={`${playPauseButtonStyle} p-4`} title={isPlaying ? "Pause" : "Play"}>{isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7" />}</button>
                                <button onClick={handleSkipForward} title="Next Track" disabled={!currentTanda} className={`${regularButtonStyle} p-3`}><ChevronRightIcon className="h-5 w-5" /></button>
                                <button onClick={playNextTanda} disabled={isLoading || (manualQueue.length === 0 && upcomingPlaylist.length <= 1)} className={`${primaryButtonStyle} p-3`} title="Next Tanda"><ChevronDoubleRightIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                    </div>

                    {/* ====== COLUMN 3: QUEUE (RIGHT) ====== */}
                    <div className="w-1/4 flex flex-col bg-black/20 rounded-xl shadow-inner overflow-hidden">
                        <h3 className="text-lg font-semibold text-center text-gray-300 p-3 flex-shrink-0 bg-black/20">Up Next</h3>
                        <div className="flex-grow overflow-y-auto"><QueueContent {...queueProps} /></div>
                    </div>
                </div>
            </div>

            {/* =================================================================== */}
            {/* ====== ORIGINAL MOBILE LAYOUT (HIDDEN ON DESKTOP) ====== */}
            {/* =================================================================== */}
            <div className="block lg:hidden p-2 sm:p-4">
                <div className="p-4 bg-[#30333a] text-white rounded-lg shadow-lg w-full max-w-[32rem] mx-auto">
                    <h2 className="text-xl font-semibold mb-4 text-center">TangoDJ</h2>
                    <div className="flex justify-center mb-4">
                        {currentTanda && currentTanda.artwork_signed ? (<img src={currentTanda.artwork_signed} alt={`Artwork for ${currentTanda.orchestra}`} className="w-64 h-64 object-cover rounded-lg shadow-md" />) : (<div className="w-64 h-64 bg-gray-700 rounded-lg shadow-md flex items-center justify-center text-gray-500">Artwork</div>)}
                    </div>
                    <div className="mb-4 text-center min-h-[4em]">
                        {currentTanda ? (<><p className="text-lg truncate font-medium">{currentTanda.orchestra || 'Unknown'}</p><p className="text-sm text-gray-400">{currentTanda.singer || 'Unknown'} - {currentTanda.type || 'Unknown'}</p><p className="text-xs text-gray-500 truncate" title={currentTrackTitle}>Track {currentTrackIndex + 1} / {Math.min(displayTotalTracks, displayTandaLength)}: {currentTrackTitle}</p></>) : (!isLoading && !error && <span>No music loaded.</span>)}
                    </div>
                    <div className="flex items-center gap-3 mb-3 px-1">
                        <span className="text-xs w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
                        <div className="relative w-full h-2 cursor-pointer group" onClick={handleProgressClick}>
                            <div className="absolute top-0 left-0 w-full h-full bg-[#222429] rounded-full shadow-[inset_3px_3px_2px_#222429,inset_-3px_-3px_2px_#3e424b]"></div>
                            <div className="absolute top-0 left-0 h-full bg-[#25edda] rounded-l-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                            <div className="absolute top-1/2 w-4 h-4 bg-[#30333a] rounded-full shadow-[2px_2px_1px_#222429,-2px_-2px_1px_#3e424b] pointer-events-none" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}></div>
                            <input type="range" min="0" max={duration || 1} value={currentTime} onMouseDown={handleSeekingStart} onTouchStart={handleSeekingStart} onChange={handleSeek} onMouseUp={handleSeekingEnd} onTouchEnd={handleSeekingEnd} disabled={!currentTanda || duration === 0} className="absolute top-0 left-0 w-full h-full opacity-0 m-0 p-0 cursor-pointer" aria-label="Track progress" />
                        </div>
                        <span className="text-xs w-10 text-left tabular-nums">{formatTime(duration)}</span>
                    </div>
                    <div className="flex justify-center items-center space-x-3 sm:space-x-4 mb-4">
                        <button onClick={handleRewind} title="Previous Tanda" disabled={tandaHistory.length === 0} className={`${regularButtonStyle} p-3`}><ChevronDoubleLeftIcon className="h-5 w-5" /></button>
                        <button onClick={handleSkipBackward} title="Skip Track Backward" disabled={!currentTanda} className={`${regularButtonStyle} p-3`}><ChevronLeftIcon className="h-5 w-5" /></button>
                        <button onClick={isPlaying ? handlePause : handlePlay} disabled={!currentTanda && isLoading} className={`${playPauseButtonStyle} p-4`} title={isPlaying ? "Pause" : "Play"}>{isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7" />}</button>
                        <button onClick={handleSkipForward} title="Skip Track Forward" disabled={!currentTanda} className={`${regularButtonStyle} p-3`}><ChevronRightIcon className="h-5 w-5" /></button>
                        <button onClick={playNextTanda} disabled={isLoading || upcomingPlaylist.length <= 1} className={`${primaryButtonStyle} p-3`} title="Next Tanda"><ChevronDoubleRightIcon className="h-5 w-5" /></button>
                    </div>
                    <div className="flex justify-center items-center space-x-4 mt-4 border-t border-gray-700/50 pt-2">
                        <button onClick={() => handlePanelToggle('settings')} title="Settings" className={`p-2 rounded-full transition-colors ${activePanel === 'settings' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}><AdjustmentsVerticalIcon className="h-6 w-6" /></button>
                        <button onClick={() => handlePanelToggle('eq')} title="Equalizer" className={`p-2 rounded-full transition-colors ${activePanel === 'eq' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}><SparklesIcon className="h-6 w-6" /></button>
                        <button onClick={() => handlePanelToggle('queue')} title="Queue" className={`p-2 rounded-full transition-colors ${activePanel === 'queue' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}><QueueListIcon className="h-6 w-6" /></button>
                    </div>
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${activePanel && activePanel !== 'queue' ? 'max-h-[500px] mt-4' : 'max-h-0'}`}>
                        <div className={activePanel === 'settings' ? 'block' : 'hidden'}>
                            <div className="p-4 rounded-lg shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]"><h3 className="text-lg font-semibold mb-4 text-center text-gray-300">Player Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
                                    <div className="flex flex-col"><label htmlFor="tandaOrder" className="block text-sm font-medium text-gray-400 mb-1">Tanda Order</label><div className="relative"><select id="tandaOrder" name="tandaOrder" value={settings.tandaOrder} onChange={(e) => handleSettingChange('tandaOrder', e.target.value)} className="w-full appearance-none cursor-pointer rounded-full bg-[#30333a] text-white p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]">{TANDA_ORDER_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select><ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none" /></div></div>
                                    <div className="flex flex-col"><label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-400 mb-1">Orchestra Type</label><div className="relative"><select id="categoryFilter" name="categoryFilter" value={settings.categoryFilter} onChange={(e) => handleSettingChange('categoryFilter', e.target.value)} className="w-full appearance-none cursor-pointer rounded-full bg-[#30333a] text-white p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]">{ORCHESTRA_TYPE_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select><ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none" /></div></div>
                                    <div className="flex flex-col items-start"><span className="block text-sm font-medium text-gray-400 mb-1">Tanda Length</span><div className="grid grid-cols-2 gap-2 mt-1 w-full">{TANDA_LENGTH_OPTIONS.map(len => (<button key={len} onClick={() => handleSettingChange('tandaLength', len)} className={`py-2 rounded-lg text-sm transition-all duration-200 ease-in-out whitespace-nowrap text-center ${settings.tandaLength === len ? 'text-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]' : 'text-gray-300 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e]'}`}>{len} Tangos</button>))}</div></div>
                                </div>
                            </div>
                        </div>
                        <div className={activePanel === 'eq' ? 'block' : 'hidden'}>
                            <div className="p-6 rounded-lg shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
                                <h3 className="text-lg font-semibold mb-2 text-center text-gray-300">Equalizer</h3>
                                <div className="relative">
                                    {eqNotification && (<div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 rounded-lg"><p className="text-white text-center p-4">{eqNotification}</p></div>)}
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex flex-col"><label htmlFor="low-eq" className="text-sm font-medium text-gray-400">LOW</label><input id="low-eq" type="range" min="-12" max="12" step="0.1" value={eq.low} onChange={(e) => handleEqChange('low', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent" /></div>
                                        <div className="flex flex-col"><label htmlFor="mid-eq" className="text-sm font-medium text-gray-400">MID</label><input id="mid-eq" type="range" min="-12" max="12" step="0.1" value={eq.mid} onChange={(e) => handleEqChange('mid', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent" /></div>
                                        <div className="flex flex-col"><label htmlFor="high-eq" className="text-sm font-medium text-gray-400">HIGH</label><input id="high-eq" type="range" min="-12" max="12" step="0.1" value={eq.high} onChange={(e) => handleEqChange('high', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent" /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* The Context Menu and Mobile Queue Panel need to be outside the main layout divs to function correctly */}
            {menuState.visible && (<ContextMenu position={{ x: menuState.x, y: menuState.y }} onClose={handleMenuClose} options={[ { label: 'Play Next', action: () => handleMenuAction(handlePlayNext) }, !manualQueueIds.includes(menuState.tandaId) && { label: 'Add to Queue', action: () => handleMenuAction(handleAddToQueue) } ].filter(Boolean)} />)}
            
            {hasMounted && !isDesktop && (
                <Queue isOpen={activePanel === 'queue'} onClose={() => handlePanelToggle('queue')} isDesktop={isDesktop} {...queueProps} />
            )}
        </div>
    );
}