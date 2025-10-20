'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import QueueItem from './QueueItem';
import ContextMenu from './ContextMenu';
import CortinaRow from './CortinaRow';
import LikedCortinaItem from './LikedCortinaItem';
import Image from 'next/image';
import {
  PlayIcon, PauseIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, AdjustmentsVerticalIcon,
  SparklesIcon, QueueListIcon, MusicalNoteIcon,
  ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowUturnLeftIcon, ArrowsRightLeftIcon, HeartIcon
} from '@heroicons/react/24/outline';
import { EllipsisVerticalIcon, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/components/AuthProvider';
import { auth } from '@/lib/firebaseClient';
import {
  TANDA_SEQUENCES,
  JUST_MODE_OPTIONS,
  TANDA_ORDER_OPTIONS,
  ORCHESTRA_TYPE_OPTIONS,
  TANDA_LENGTH_OPTIONS,
  PLAYLIST_REFILL_THRESHOLD,
  MIN_SAME_ORCHESTRA_GAP,
  initialSettings
} from './tangoPlayerConstants';

const QUICK_MODE_VALUES = new Set(JUST_MODE_OPTIONS.map((opt) => opt.value));

function Queue({
  isOpen, onClose, isDesktop, rightPanelTab, setRightPanelTab,
  likedItems, handleLikedDragEnd, scheduledCortinas, sensors,
  onMenuOpen, onPlayNow, handleRefreshPlaylist, isRefreshing,
  handleSettingChange, settings, currentCortina, isCortinaPlaying,
  handleCortinaDragEnd, onCortinaMenuOpen, handleDragStart, handleDragCancel,
  currentTandaId,
  ...props
}) {
  const panelRef = useRef(null);
  const isDraggingPanel = useRef(false);
  const touchStartY = useRef(0);
  const touchMoveY = useRef(0);
  const activeCortinaId = isCortinaPlaying && currentCortina ? currentCortina.id : null;
  const likedList = Array.isArray(likedItems) ? likedItems : [];
  const scheduledCortinaList = Array.isArray(scheduledCortinas) ? scheduledCortinas : [];
  const handleTouchStart = (e) => {
    if (isDesktop) return;
    const target = e.target;
    const interactiveSelector = 'button, a, input, select, textarea, [role="button"], [data-panel-no-drag]';
    if (target?.closest && target.closest(interactiveSelector)) {
      isDraggingPanel.current = false;
      return;
    }
    touchStartY.current = e.targetTouches[0].clientY;
    touchMoveY.current = touchStartY.current;
    const scrollTop = props.queueContainerRef.current?.scrollTop ?? 0;
    isDraggingPanel.current = scrollTop <= 0;
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
    if (isDraggingPanel.current && deltaY > 50) onClose();
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
      <div className="absolute inset-0 bg-black/60 lg:hidden" onClick={onClose}></div>
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          bg-[#30333a] shadow-2xl lg:shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b] flex flex-col
          transition-all duration-500 ease-in-out
          absolute bottom-0 left-0 right-0 w-full max-w-[28rem] mx-auto h-[85%] rounded-t-2xl transform
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          lg:relative lg:h-full lg:w-full lg:rounded-lg lg:transform-none lg:mx-0
          lg:transition-opacity ${isOpen ? 'lg:opacity-100' : 'lg:opacity-0'}
        `}
      >
        <div className="w-12 h-1.5 bg-gray-500 rounded-full mx-auto my-3 flex-shrink-0 lg:hidden"></div>
        <div className={`flex flex-col h-full overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
          {/* NEW: Tab Buttons */}
          <div className="flex-shrink-0 p-2">
            <div className="grid grid-cols-3">
              <button
                onClick={() => setRightPanelTab('queue')}
                className={`py-2 text-sm font-medium transition-all duration-200 ease-in-out border-r border-white/5 hover:scale-105 flex items-center justify-center gap-2 ${rightPanelTab === 'queue' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
              >
                <QueueListIcon className="h-4 w-4" />
                <span>Queue</span>
              </button>
              <button
                onClick={() => setRightPanelTab('cortinas')}
                className={`py-2 text-sm font-medium transition-all duration-200 ease-in-out border-r border-white/5 hover:scale-105 flex items-center justify-center gap-2 ${rightPanelTab === 'cortinas' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
              >
                <MusicalNoteIcon className="h-4 w-4" />
                <span>Cortinas</span>
              </button>
              <button
                onClick={() => setRightPanelTab('liked')}
                className={`py-2 text-sm font-medium transition-all duration-200 ease-in-out hover:scale-105 flex items-center justify-center gap-2 ${rightPanelTab === 'liked' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
              >
                <HeartIcon className="h-4 w-4" />
                <span>Liked</span>
              </button>
            </div>
          </div>
          {rightPanelTab === 'queue' && (
            <div className="px-3 pb-2 lg:hidden">
              <button
                onClick={handleRefreshPlaylist}
                title={'Shuffle Playlist'}
                disabled={isRefreshing}
                className="w-full py-1 rounded-full border border-[#25edda] text-sm transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center gap-2 text-[#25edda] hover:bg-[#25edda]/10 disabled:opacity-50"
              >
                <ArrowsRightLeftIcon className="h-5 w-5" />
                Shuffle
              </button>
            </div>
          )}
          {/* NEW: Conditional Content */}
          <div className="w-full h-full overflow-y-auto">
            {rightPanelTab === 'queue' && (
              <QueueContent {...props} onMenuOpen={onMenuOpen} settings={settings} isDesktop={isDesktop} handleDragStart={handleDragStart} currentTandaId={currentTandaId} />
            )}
            {rightPanelTab === 'liked' && (
              <div className="p-3 px-2 pb-20">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleLikedDragEnd} onDragCancel={handleDragCancel} modifiers={[restrictToVerticalAxis]}>
                  <SortableContext items={likedList.map(item => item.sortableId ?? item.key)} strategy={verticalListSortingStrategy}>
                    {likedList.length > 0 ? (
                      likedList.map(item => (
                        item.itemType === 'tanda' ? (
                          <QueueItem // This is a Tanda
                            key={item.key}
                            tanda={item.tanda}
                            sortableId={item.sortableId}
                            onMenuOpen={onMenuOpen}
                            onPlayNow={onPlayNow}
                            isDesktop={isDesktop}
                          />
                        ) : ( // This is a Cortina
                          <LikedCortinaItem
                            key={item.key}
                            item={item.cortina}
                            sortableId={item.sortableId}
                            onMenuOpen={onCortinaMenuOpen}
                          />
                        )
                      ))
                    ) : (
                      <p className="p-4 text-center text-gray-500">Your liked items will appear here.</p>
                    )}
                  </SortableContext>
                </DndContext>
              </div>
            )}
            {rightPanelTab === 'cortinas' && (
              <div className="p-3 px-2 pb-20">
                {scheduledCortinaList.length > 0 ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleCortinaDragEnd} onDragCancel={handleDragCancel} modifiers={[restrictToVerticalAxis]}>
                    <SortableContext items={scheduledCortinaList.map(item => item.sortableId || item.key)} strategy={verticalListSortingStrategy}>
                      {scheduledCortinaList.map((item, idx) => {
                        const isActive = isCortinaPlaying && idx === 0 && activeCortinaId && item.cortinaId && activeCortinaId === item.cortinaId;
                        return (
                          <CortinaRow
                            key={item.key}
                            item={item}
                            sortableId={item.sortableId}
                            isActive={isActive}
                            onMenuOpen={onCortinaMenuOpen}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="p-4 text-center text-gray-500">No cortinas scheduled.</p>
                )}
              </div>
            )}
          </div>
          {rightPanelTab === 'queue' && (
            <div className="px-3 pb-4 lg:hidden">
              <PanelFooter
                handleRefreshPlaylist={handleRefreshPlaylist}
                isRefreshing={isRefreshing}
                handleSettingChange={handleSettingChange}
                settings={settings}
              />
            </div>
          )}
        </div>
    </div>
  </div>
  );
}

// --- Unified Queue Component (for Mobile Bottom Sheet) ---
// --- Shared QueueContent Component ---
function QueueContent({
  user,
  manualQueue,
  upcomingPlaylist,
  manualQueueIds,
  upcomingPlaylistIds,
  handleDragEnd,
  handleDragStart,
  handleDragCancel,
  handleQueueScroll,
  queueContainerRef,
  sensors,
  onMenuOpen,
  onPlayNow,
  isDesktop,
  handleSettingChange,
  settings: settings,
  isRefreshing,
  handleRefreshPlaylist,
  isPro,
  currentTandaId
}) {
  const fallbackCortina = { title: "Cortina", artist: "" };
  const renderSeparatorFor = (tanda) => {
    const cortina = tanda?.cortinaMeta || fallbackCortina;
    return (
      <div className="flex items-center gap-2 my-0 px-2 text-center">
        <div className="flex-grow h-px bg-white/10"></div>
        <div className="flex-shrink-0 text-xs text-gray-500 italic flex items-center min-w-0 max-w-[70%]">
          <MusicalNoteIcon className="h-4 w-4 inline-block mr-1 flex-shrink-0" />
          <span className="truncate">
            {cortina.title}{cortina.artist ? ` - ${cortina.artist}` : ''}
          </span>
        </div>
        <div className="flex-grow h-px bg-white/10"></div>
      </div>
    );
  };
  return (
    <>
      <div
        ref={queueContainerRef}
        onScroll={handleQueueScroll}
        className="flex-grow overflow-y-auto p-3 px-2 h-full pb-20"
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} modifiers={[restrictToVerticalAxis]}>
          <SortableContext items={[...manualQueueIds, ...upcomingPlaylistIds]} strategy={verticalListSortingStrategy}>
            {manualQueue.map((tanda, index) => (
              <React.Fragment key={tanda.id}>
                {settings.cortinas && index > 0 && renderSeparatorFor(tanda)}
                <QueueItem tanda={tanda} onMenuOpen={onMenuOpen} onPlayNow={onPlayNow} isDesktop={isDesktop} isActive={currentTandaId === tanda.id} />
              </React.Fragment>
            ))}
            {manualQueue.length > 0 && upcomingPlaylist.length > 0 && (
              <div className="flex items-center gap-2 my-2 px-2 text-center">
                <div className="flex-grow h-px bg-white/10"></div>
                <div className="flex-shrink-0 text-xs text-gray-500 italic">
                  {settings.cortinas ? `Up Next:` : "Up Next"}
                </div>
                <div className="flex-grow h-px bg-white/10"></div>
              </div>
            )}
            {upcomingPlaylist.map((tanda, index) => (
              <React.Fragment key={tanda.id}>
                {settings.cortinas && (manualQueue.length > 0 || index > 0) && renderSeparatorFor(tanda)}
                <QueueItem tanda={tanda} onMenuOpen={onMenuOpen} onPlayNow={onPlayNow} isDesktop={isDesktop} isActive={currentTandaId === tanda.id} />
              </React.Fragment>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}
// --- EQ Panel Component ---

function EqPanel({ isOpen, onClose, user, eq, handleEqChange, handleResetEq, eqNotification, isPro }) {
  const panelRef = useRef(null);
  const disabled = user && !isPro;
  return (
    <div className={`fixed inset-0 z-10 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div
        ref={panelRef}
        className={`bg-[#30333a] shadow-2xl flex flex-col absolute bottom-0 left-0 right-0 w-full max-w-[28rem] mx-auto rounded-t-2xl transform transition-all duration-500 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="w-12 h-1.5 bg-gray-500 rounded-full mx-auto my-3 flex-shrink-0"></div>
        <div className="p-6 relative">
          {eqNotification && (
            <div className="absolute inset-0 backdrop-blur-xs rounded-lg flex items-center justify-center z-10">
              <p className="text-white text-center text-sm p-4">{eqNotification}</p>
            </div>
          )}
          <h3 className="relative text-lg mb-4 text-center text-gray-300">
            Equalizer
            <button onClick={handleResetEq} title="Reset Equalizer" disabled={user && !isPro} className="absolute top-1/2 right-0 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50">
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>
          </h3>
          <div className={`flex flex-col space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex flex-col">
              <label htmlFor="high-eq-mobile" className="text-sm font-medium text-gray-400">HIGH</label>
              <input id="high-eq-mobile" type="range" min="-12" max="12" step="0.1" value={eq.high} onChange={(e) => handleEqChange('high', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent" disabled={disabled} />
            </div>
            <div className="flex flex-col">
              <label htmlFor="mid-eq-mobile" className="text-sm font-medium text-gray-400">MID</label>
              <input id="mid-eq-mobile" type="range" min="-12" max="12" step="0.1" value={eq.mid} onChange={(e) => handleEqChange('mid', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent" disabled={disabled} />
            </div>
            <div className="flex flex-col">
              <label htmlFor="low-eq-mobile" className="text-sm font-medium text-gray-400">LOW</label>
              <input id="low-eq-mobile" type="range" min="-12" max="12" step="0.1" value={eq.low} onChange={(e) => handleEqChange('low', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent" disabled={disabled} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// --- Settings Panel Component ---

function PanelFooter({ handleRefreshPlaylist: _handleRefreshPlaylist, isRefreshing: _isRefreshing, handleSettingChange, settings }) {
  return (
    <div className="flex-shrink-0 mb-2 mt-2 w-full flex flex-col">
      <span className="text-sm font-medium text-gray-400">Cortinas</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={settings.cortinas}
          aria-label="Toggle cortinas"
          onClick={() => handleSettingChange('cortinas', !settings.cortinas)}
          className={`relative inline-flex h-6 w-16 items-center rounded-full px-1 transition-colors duration-200 ${
            settings.cortinas ? 'bg-[#25edda]' : 'bg-gray-600'
          }`}
        >
          <span className="absolute inset-0 flex items-center px-3 text-[10px] font-bold uppercase tracking-wide text-gray-900/70">
            {settings.cortinas ? <span className="flex-1 text-left">ON</span> : <span className="flex-1 text-right">OFF</span>}
          </span>
          <span
            className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#30333a] shadow-md transition-all duration-200"
            style={{
              left: settings.cortinas ? 'calc(100% - 1.5rem)' : '0.25rem',
            }}
          />
        </button>
        <div className="flex flex-1 gap-0">
          <button
            onClick={() => handleSettingChange('cortinaFullLength', false)}
            disabled={!settings.cortinas}
            className={`flex-1 rounded-l-full h-9 px-3 text-xs transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center ${
              !settings.cortinas
                ? 'bg-[#30333a] text-gray-500 border border-gray-600 opacity-40 cursor-not-allowed'
                : !settings.cortinaFullLength
                  ? 'text-[#25edda] bg-[#30333a] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]'
                  : 'text-gray-400 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d]'
            } ${settings.cortinas ? 'hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e]' : ''}`}
          >
            45 sec Cortina
          </button>
          <button
            onClick={() => handleSettingChange('cortinaFullLength', true)}
            disabled={!settings.cortinas}
            className={`flex-1 rounded-r-full h-9 px-3 text-xs transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center ${
              !settings.cortinas
                ? 'bg-[#30333a] text-gray-500 border border-gray-600 opacity-40 cursor-not-allowed'
                : settings.cortinaFullLength
                  ? 'text-[#25edda] bg-[#30333a] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]'
                  : 'text-gray-400 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d]'
            } ${settings.cortinas ? 'hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e]' : ''}`}
          >
            Full Cortina
          </button>
        </div>
      </div>
    </div>
  );
}
function SettingsPanel({
  isOpen,
  onClose,
  user,
  settings,
  handleSettingChange,
  isPro,
  lastFullSequence,
  activeFullSequence,
  onFullSequenceSelect,
}) {
  const panelRef = useRef(null);
  const segments = useMemo(() => [
    { value: 'full', label: 'Mix' },
    ...JUST_MODE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
  ], []);
  const fullSequenceOptions = useMemo(() => TANDA_ORDER_OPTIONS, []);
  const isQuickMode = QUICK_MODE_VALUES.has(settings.activeMode);
  const selectedSegment = isQuickMode ? settings.activeMode : 'full';
  const handleSegmentSelect = (value) => {
    if (value === 'full') {
      const fallback = lastFullSequence || TANDA_ORDER_OPTIONS[0]?.value || '';
      if (fallback) onFullSequenceSelect(fallback);
      return;
    }
    handleSettingChange('activeMode', value);
  };
  return (
    <div className={`fixed inset-0 z-10 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div
        ref={panelRef}
        className={`bg-[#30333a] shadow-2xl flex flex-col absolute bottom-0 left-0 right-0 w-full max-w-[28rem] mx-auto rounded-t-2xl transform transition-all duration-500 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="w-12 h-1.5 bg-gray-500 rounded-full mx-auto my-3 flex-shrink-0"></div>
        <div className="p-4">
          <h3 className="text-lg mb-1 text-center text-gray-300">Settings</h3>
          <div className="flex flex-col gap-3">
            {/* 1. Orchestra Type */}
            <div className="flex gap-2 flex-col">
              <label htmlFor="categoryFilterMobile" className="block text-sm font-medium text-gray-400 mb-1">Orchestra Type</label>
              <div className="relative">
                <select id="categoryFilterMobile" name="categoryFilter" value={settings.categoryFilter} onChange={(e) => handleSettingChange('categoryFilter', e.target.value)} className="w-full h-10 appearance-none cursor-pointer rounded-full bg-[#30333a] text-white px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]">
                  {ORCHESTRA_TYPE_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                </select>
                <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            {/* 3. Tanda Sequence */}
            <div className="flex flex-col gap-4">
              <span className="block text-sm font-medium text-gray-400">Tanda Sequence</span>
              <div className="flex w-full h-10 items-center rounded-full bg-[#30333a] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e] text-xs p-0.5">
                {segments.map((segment, index) => {
                  const isSelected = selectedSegment === segment.value;
                  return (
                    <button
                      key={segment.value}
                      onClick={() => handleSegmentSelect(segment.value)}
              className={`flex-1 h-10 md:h-10 transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center rounded-full ${isSelected ? 'bg-[#30333a] text-[#25edda] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d]' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                      {segment.label}
                    </button>
                  );
                })}
              </div>
              {!isQuickMode && (
                <div className="mt-2 relative">
                  <select
                    value={activeFullSequence}
                    onChange={(event) => onFullSequenceSelect(event.target.value)}
                    className="w-full h-10 appearance-none rounded-full bg-[#30333a] text-white px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
                  >
                    {fullSequenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                </div>
              )}
              {/* 2. Tango Tanda Length */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-gray-400">Tango Tanda Length</span>
                <div className={`flex w-full ${user && !isPro ? 'opacity-50 pointer-events-none' : ''}`}>
                  {TANDA_LENGTH_OPTIONS.map((len, index) => {
                    const isActive = settings.tandaLength === len;
                    return (
                      <button
                        key={len}
                        onClick={() => handleSettingChange('tandaLength', len)}
                        disabled={user && !isPro}
                        className={`flex-1 h-10 px-4 text-sm transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center ${
                          isActive
                            ? 'text-[#25edda] bg-[#30333a] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]'
                            : 'text-gray-400 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e]'
                        } ${index === 0 ? 'rounded-l-full' : index === TANDA_LENGTH_OPTIONS.length - 1 ? 'rounded-r-full' : ''}`}
                      >
                        {len} Tangos
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* 4. Cortinas */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-400">Cortinas</span>
              <div className="flex items-center mb-6 gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.cortinas}
                  aria-label="Toggle cortinas"
                  onClick={() => handleSettingChange('cortinas', !settings.cortinas)}
                  className={`relative inline-flex h-6 w-16 items-center rounded-full px-1 transition-colors duration-200 ${
                    settings.cortinas ? 'bg-[#25edda]' : 'bg-gray-600'
                  }`}
                >
                  <span className="absolute inset-0 flex items-center px-3 text-[10px] font-bold uppercase tracking-wide text-gray-900/70">
                    {settings.cortinas ? <span className="flex-1 text-left">ON</span> : <span className="flex-1 text-right">OFF</span>}
                  </span>
                  <span
                    className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#30333a] shadow-md transition-all duration-200"
                    style={{
                      left: settings.cortinas ? 'calc(100% - 1.5rem)' : '0.25rem',
                    }}
                  />
                </button>
                <div className="flex flex-1 gap-0">
                  <button
                    onClick={() => handleSettingChange('cortinaFullLength', false)}
                    disabled={!settings.cortinas}
                    className={`flex-1 rounded-l-full h-9 px-3 text-xs transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center ${
                      !settings.cortinas
                        ? 'bg-[#30333a] text-gray-500 border border-gray-600 opacity-40 cursor-not-allowed'
                        : !settings.cortinaFullLength
                          ? 'text-[#25edda] bg-[#30333a] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]'
                          : 'text-gray-400 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d]'
                    } ${settings.cortinas ? 'hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e]' : ''}`}
                  >
                    45 sec Cortina
                  </button>
                  <button
                    onClick={() => handleSettingChange('cortinaFullLength', true)}
                    disabled={!settings.cortinas}
                    className={`flex-1 rounded-r-full h-9 px-3 text-xs transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center ${
                      !settings.cortinas
                        ? 'bg-[#30333a] text-gray-500 border border-gray-600 opacity-40 cursor-not-allowed'
                        : settings.cortinaFullLength
                          ? 'text-[#25edda] bg-[#30333a] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]'
                          : 'text-gray-400 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d]'
                    } ${settings.cortinas ? 'hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e]' : ''}`}
                  >
                    Full Cortina
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
    </div>
  );
}


// --- Helper Functions ---
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
function formatHHMMLocal(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}
function attachCortinas(existingBefore, batch, cortinaPool) {
  if (!cortinaPool || cortinaPool.length === 0) {
    return batch.map(t => ({ ...t, cortinaMeta: null }));
  }
  const base = existingBefore.length % cortinaPool.length;
  return batch.map((t, i) => ({
    ...t,
    cortinaMeta: cortinaPool[(base + i) % cortinaPool.length] || null
  }));
}

const CATEGORY_KEYS = {
  TM: 'TM',
  TR: 'TR',
  V: 'V',
  M: 'M',
};

function getSequenceSlots(activeMode) {
  if (!activeMode) return [];
  const rawSequence = TANDA_SEQUENCES[activeMode];
  if (Array.isArray(rawSequence) && rawSequence.length > 0) {
    return rawSequence
      .map(slot => String(slot || '').trim().toLowerCase())
      .filter(Boolean);
  }
  const normalized = String(activeMode).trim().toLowerCase();
  if (['tango', 'vals', 'milonga'].includes(normalized)) {
    return [normalized];
  }
  return [];
}

function buildGeneratorContext(library, activeMode, orchestraGapSize = MIN_SAME_ORCHESTRA_GAP) {
  if (!library || !Array.isArray(library.buckets?.tangoMelodic)) {
    return null;
  }

  const sequence = getSequenceSlots(activeMode);
  if (sequence.length === 0) return null;

  const clone = (arr) => (Array.isArray(arr) ? [...arr] : []);

  const context = {
    sequence,
    seqIndex: 0,
    nextTangoSubtype: 'melodic',
    lastTangoOrchestras: [],
    orchestraGapSize: Math.max(0, orchestraGapSize || 0),
    allIds: {
      TM: clone(library.buckets.tangoMelodic),
      TR: clone(library.buckets.tangoRhythmic),
      V: clone(library.buckets.vals),
      M: clone(library.buckets.milonga),
    },
    unplayed: {},
    metaById: library.metaById || {},
    cache: new Map(),
    history: [],
  };

  context.unplayed = {
    TM: clone(context.allIds.TM),
    TR: clone(context.allIds.TR),
    V: clone(context.allIds.V),
    M: clone(context.allIds.M),
  };

  return context;
}

function resolveTangoCategoryKey(context) {
  const preferred = context.nextTangoSubtype === 'melodic' ? CATEGORY_KEYS.TM : CATEGORY_KEYS.TR;
  const preferredPool = context.allIds[preferred] || [];
  if (preferredPool.length > 0) {
    return preferred;
  }
  const alternate = preferred === CATEGORY_KEYS.TM ? CATEGORY_KEYS.TR : CATEGORY_KEYS.TM;
  const alternatePool = context.allIds[alternate] || [];
  if (alternatePool.length > 0) {
    return alternate;
  }
  return preferred;
}

function resolveCategoryKeyForSlot(context, slotKind) {
  if (slotKind === 'tango') {
    return resolveTangoCategoryKey(context);
  }
  if (slotKind === 'vals') {
    return CATEGORY_KEYS.V;
  }
  if (slotKind === 'milonga') {
    return CATEGORY_KEYS.M;
  }
  return null;
}

function pickNextTandaId(context, randomFn = Math.random) {
  if (!context || !Array.isArray(context.sequence) || context.sequence.length === 0) {
    return null;
  }

  const slotKind = context.sequence[context.seqIndex] || 'tango';
  const categoryKey = resolveCategoryKeyForSlot(context, slotKind);
  if (!categoryKey) return null;

  const allIds = context.allIds[categoryKey] || [];
  if (allIds.length === 0) {
    return null;
  }

  if (!Array.isArray(context.unplayed[categoryKey]) || context.unplayed[categoryKey].length === 0) {
    context.unplayed[categoryKey] = [...allIds];
  }

  let candidates = context.unplayed[categoryKey];
  if (!Array.isArray(candidates) || candidates.length === 0) {
    candidates = [...allIds];
  }

  const isTango = categoryKey === CATEGORY_KEYS.TM || categoryKey === CATEGORY_KEYS.TR;
  if (isTango && context.orchestraGapSize > 0 && context.lastTangoOrchestras.length > 0) {
    const filtered = candidates.filter(id => {
      const orchestraKey = context.metaById[id]?.orchestraKey;
      return orchestraKey && !context.lastTangoOrchestras.includes(orchestraKey);
    });
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const pickIndex = Math.floor(randomFn() * candidates.length);
  const pickedId = candidates[pickIndex];

  context.unplayed[categoryKey] = context.unplayed[categoryKey].filter(id => id !== pickedId);

  const pickedMeta = context.metaById[pickedId] || {};

  if (isTango) {
    const orchestraKey = pickedMeta.orchestraKey;
    if (orchestraKey) {
      context.lastTangoOrchestras.push(orchestraKey);
      if (context.lastTangoOrchestras.length > context.orchestraGapSize) {
        context.lastTangoOrchestras.shift();
      }
    }
    context.nextTangoSubtype = context.nextTangoSubtype === 'melodic' ? 'rhythmic' : 'melodic';
  }

  context.seqIndex = (context.seqIndex + 1) % context.sequence.length;
  context.history.push(pickedId);

  return {
    id: pickedId,
    categoryKey,
    meta: pickedMeta,
  };
}

export default function TangoPlayer() {
  // 1. Refs
  const audioRef = useRef(null);
  const queueContainerRef = useRef(null);
  const autoplayIntentRef = useRef(false);
  const cortinaTimeoutRef = useRef(null);
  const cortinaEndTimeRef = useRef(null);
  const cortinaTimeUpdateHandlerRef = useRef(null);
  const cortinaFadeRafRef = useRef(null);
  const cortinaFadeOutStartedRef = useRef(false);
  const fadeConfigRef = useRef({ fadeIn: 0, fadeOut: 0 });
  const isCortinaPlayingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const isResettingRef = useRef(false);
  const generatorRef = useRef(null);
  const manualQueueRef = useRef([]);
  const upcomingPlaylistRef = useRef([]);
  const shuffledCortinasRef = useRef([]);
  const cancelCortinaFade = useCallback(() => {
    if (typeof window !== 'undefined' && cortinaFadeRafRef.current !== null) {
      window.cancelAnimationFrame(cortinaFadeRafRef.current);
      cortinaFadeRafRef.current = null;
    }
  }, []);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const lowShelfRef = useRef(null);
  const midPeakingRef = useRef(null);
  const highShelfRef = useRef(null);
  const masterGainRef = useRef(null);
  const initAudioGraphRef = useRef(() => {});

  const getEffectiveVolume = useCallback(() => {
    if (masterGainRef.current && audioContextRef.current) {
      const value = masterGainRef.current.gain.value;
      return Number.isFinite(value) ? value : volumeRef.current;
    }
    if (audioRef.current) {
      const value = Number(audioRef.current.volume);
      return Number.isFinite(value) ? value : volumeRef.current;
    }
    return volumeRef.current;
  }, []);

  const setEffectiveVolume = useCallback((value) => {
    const clamped = Math.min(1, Math.max(0, Number(value)));
    if (masterGainRef.current && audioContextRef.current) {
      const gainNode = masterGainRef.current.gain;
      const audioCtx = audioContextRef.current;
      try {
        if (typeof gainNode.setValueAtTime === 'function') {
          gainNode.setValueAtTime(clamped, audioCtx.currentTime);
        }
      } catch {
        // ignore scheduling errors, fall back to direct assignment below
      }
      gainNode.value = clamped;
      if (audioRef.current) {
        try {
          audioRef.current.volume = 1;
        } catch {
          /* ignore readonly volume */
        }
      }
    } else if (audioRef.current) {
      try {
        audioRef.current.volume = clamped;
      } catch {
        /* ignore readonly volume */
      }
    }
    return clamped;
  }, []);
  const clearCortinaTimeout = useCallback(() => {
    if (cortinaTimeoutRef.current) {
      clearTimeout(cortinaTimeoutRef.current);
      cortinaTimeoutRef.current = null;
    }
    if (cortinaTimeUpdateHandlerRef.current && audioRef.current) {
      audioRef.current.removeEventListener('timeupdate', cortinaTimeUpdateHandlerRef.current);
      cortinaTimeUpdateHandlerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.onloadedmetadata = null;
    }
    cancelCortinaFade();
    cortinaEndTimeRef.current = null;
    cortinaFadeOutStartedRef.current = false;
    setEffectiveVolume(volumeRef.current);
    if (audioRef.current) {
      audioRef.current.muted = false;
    }
  }, [cancelCortinaFade, setEffectiveVolume]);

  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);
  const [isDesktop, setIsDesktop] = useState(false);
  const shouldUseWebAudio = useMemo(() => isDesktop && !isIOS, [isDesktop, isIOS]);
  const startCortinaFade = useCallback((targetVolume, durationSeconds, onComplete) => {
    const audio = audioRef.current;
    if (!audio) return;
    cancelCortinaFade();

    const useWebAudio = shouldUseWebAudio;
    if (useWebAudio && !audioContextRef.current) {
      initAudioGraphRef.current();
    }

    const applyVolume = (value) => {
      const clamped = Math.min(1, Math.max(0, Number(value)));
      if (useWebAudio && masterGainRef.current && audioContextRef.current) {
        setEffectiveVolume(clamped);
      } else {
        audio.volume = clamped;
      }
      return clamped;
    };

    const clampedTarget = Math.min(1, Math.max(0, Number(targetVolume)));
    if (clampedTarget > 0) {
      audio.muted = false;
    }

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      applyVolume(clampedTarget);
      onComplete?.();
      return;
    }

    const startVolumeRaw = (useWebAudio && masterGainRef.current && audioContextRef.current)
      ? getEffectiveVolume()
      : Number(audio.volume);
    const startVolume = Number.isFinite(startVolumeRaw) ? Math.min(1, Math.max(0, startVolumeRaw)) : 1;
    if (startVolume !== startVolumeRaw) {
      applyVolume(startVolume);
    }

    const startTime = typeof window !== 'undefined' ? window.performance.now() : Date.now();
    const step = (now) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / durationSeconds, 1);
      const nextVolume = startVolume + (clampedTarget - startVolume) * progress;
      applyVolume(nextVolume);
      if (progress >= 1) {
        cortinaFadeRafRef.current = null;
        onComplete?.();
      } else if (typeof window !== 'undefined') {
        cortinaFadeRafRef.current = window.requestAnimationFrame(step);
      }
    };
    if (typeof window !== 'undefined') {
      cortinaFadeRafRef.current = window.requestAnimationFrame(step);
    } else {
      applyVolume(clampedTarget);
      onComplete?.();
    }
  }, [cancelCortinaFade, getEffectiveVolume, setEffectiveVolume, shouldUseWebAudio]);

  // 2. State
  const [tier, setTier] = useState('free');
  const [skipMsg, setSkipMsg] = useState('');
  const [settings, setSettings] = useState(initialSettings);
  const [libraryState, setLibraryState] = useState({
    buckets: null,
    metaById: {},
    loading: false,
    error: null,
    category: null,
    version: 0,
  });
  const [upcomingPlaylist, setUpcomingPlaylist] = useState([]);
  const [manualQueue, setManualQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarsVisible, setSidebarsVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState(new Set());
  const [tandaHistory, setTandaHistory] = useState([]);
  const [resetCounter, setResetCounter] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const volumeRef = useRef(1);
  useEffect(() => {
    const sanitized = Math.min(1, Math.max(0, Number(volume)));
    volumeRef.current = sanitized;
  }, [volume]);

  useEffect(() => {
    manualQueueRef.current = manualQueue;
  }, [manualQueue]);
  useEffect(() => {
    upcomingPlaylistRef.current = upcomingPlaylist;
  }, [upcomingPlaylist]);

  const [activePanel, setActivePanel] = useState(null);
  const [eq, setEq] = useState({ low: 0, mid: 0, high: 0 });
  const [menuState, setMenuState] = useState({
    visible: false,
    x: 0,
    y: 0,
    anchorRect: null,
    placement: 'left',
    verticalAlign: 'top',
    horizontalAlign: 'left',
    offset: 12,
    offsetY: 0,
    itemType: null,
    tandaId: null,
    cortinaKey: null,
    cortinaMeta: null,
  });
  const [eqNotification, setEqNotification] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const [cortinas, setCortinas] = useState([]);
  const [cortinaPoolReady, setCortinaPoolReady] = useState(false);
  const [isCortinaPlaying, setIsCortinaPlaying] = useState(false);
  const [currentCortina, setCurrentCortina] = useState(null);
  const [shuffledCortinas, setShuffledCortinas] = useState([]);
  const [currentCortinaFull, setCurrentCortinaFull] = useState(false);
  const [lastFullSequence, setLastFullSequence] = useState(() => {
    const defaultSequence = TANDA_ORDER_OPTIONS[0]?.value ?? '';
    const initialMode = initialSettings.activeMode ?? defaultSequence;
    return QUICK_MODE_VALUES.has(initialMode) ? defaultSequence : initialMode;
  });
  const segments = useMemo(() => [
    { value: 'full', label: 'Mix' },
    ...JUST_MODE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
  ], []);
  const fullSequenceOptions = useMemo(() => TANDA_ORDER_OPTIONS, []);
  const isQuickMode = useMemo(() => QUICK_MODE_VALUES.has(settings.activeMode), [settings.activeMode]);
  const selectedSegment = isQuickMode ? settings.activeMode : 'full';
  const activeFullSequence = useMemo(() => {
    if (!settings.activeMode || isQuickMode) {
      return lastFullSequence || TANDA_ORDER_OPTIONS[0]?.value || '';
    }
    return settings.activeMode;
  }, [isQuickMode, lastFullSequence, settings.activeMode]);
  const [isChangingSettings] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('queue');
  const [likedTandas, setLikedTandas] = useState([]);
  const [likedCortinas, setLikedCortinas] = useState([]);
  const [localLikedCortinaIds, setLocalLikedCortinaIds] = useState(new Set());
  const [activeDragItem, setActiveDragItem] = useState(null);
  // 3. Custom Hooks
  const { user, isPro, requireAuth, likedTandaIds, likedCortinaIds, likedMixedOrder, updateLikedIds, updateLikedCortinaIds, updateLikedMixedOrder } = useAuth();
  const [likedItemOrder, setLikedItemOrder] = useState(() => (Array.isArray(likedMixedOrder) ? likedMixedOrder : []));
  const [localLikedIds, setLocalLikedIds] = useState(new Set());
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );
  useEffect(() => {
    shuffledCortinasRef.current = shuffledCortinas;
  }, [shuffledCortinas]);
  useEffect(() => {
    if (!isCortinaPlaying) {
      setCurrentCortinaFull(false);
    }
  }, [isCortinaPlaying]);
  useEffect(() => {
    if (settings.activeMode && !QUICK_MODE_VALUES.has(settings.activeMode)) {
      setLastFullSequence(settings.activeMode);
    }
  }, [settings.activeMode]);
  const libraryBuckets = libraryState.buckets;
  const libraryMeta = libraryState.metaById;
  const libraryLoading = libraryState.loading;
  const libraryVersion = libraryState.version;
  useEffect(() => {
    if (libraryLoading) return;
    if (!libraryBuckets) {
      generatorRef.current = null;
      return;
    }
    const context = buildGeneratorContext(
      { buckets: libraryBuckets, metaById: libraryMeta, version: libraryVersion },
      settings.activeMode,
      MIN_SAME_ORCHESTRA_GAP
    );
    generatorRef.current = context;
    if (!context) {
      setError('No tandas available for this selection.');
      setIsRefreshing(false);
      return;
    }
    const totalAvailable =
      (context.allIds.TM?.length || 0) +
      (context.allIds.TR?.length || 0) +
      (context.allIds.V?.length || 0) +
      (context.allIds.M?.length || 0);
    if (totalAvailable === 0) {
      setError('No tandas available for this selection.');
    } else {
      setError(null);
    }
    isFetchingRef.current = false;
    setSkipMsg('');
    setIsPlaying(false);
    setCurrentTrackIndex(0);
    setCurrentTime(0);
    setRecentlyPlayedIds(new Set());
    setTandaHistory([]);
    isResettingRef.current = true;
    setResetCounter(c => c + 1);
    setIsRefreshing(false);
  }, [libraryLoading, libraryBuckets, libraryMeta, libraryVersion, settings.activeMode]);
  // 4. Memos
  const currentTanda = useMemo(() => manualQueue.length > 0 ? manualQueue[0] : upcomingPlaylist[0] || null, [manualQueue, upcomingPlaylist]);
  const manualQueueIds = useMemo(() => manualQueue.map(t => t.id), [manualQueue]);
  const upcomingPlaylistIds = useMemo(() => upcomingPlaylist.map(t => t.id), [upcomingPlaylist]);
  const queueWithCurrent = useMemo(() => (
    manualQueue.length > 0 ? [...manualQueue, ...upcomingPlaylist] : [...upcomingPlaylist]
  ), [manualQueue, upcomingPlaylist]);
  const syncLikedOrderToAuth = useCallback((order) => {
    if (!Array.isArray(order)) {
      console.warn('[syncLikedOrderToAuth] ignoring non-array order', order);
      return;
    }
    const nextOrder = order.filter(Boolean);
    const currentKey = JSON.stringify(Array.isArray(likedMixedOrder) ? likedMixedOrder : []);
    const nextKey = JSON.stringify(nextOrder);

    if (currentKey !== nextKey) {
      console.log('[syncLikedOrderToAuth] updating auth order', nextOrder);
      updateLikedMixedOrder(nextOrder);
    } else {
      console.log('[syncLikedOrderToAuth] no change needed', { order: nextOrder });
    }
  }, [likedMixedOrder, updateLikedMixedOrder]);

  const fallbackOrder = useMemo(() => {
    const tandaEntries = likedTandas.map(t => ({ type: 'tanda', id: t.id }));
    const cortinaEntries = likedCortinas.map(c => ({ type: 'cortina', id: c.id }));
    return [...tandaEntries, ...cortinaEntries];
  }, [likedTandas, likedCortinas]);

  const mergedOrder = useMemo(() => {
    if (likedItemOrder.length === 0) {
      return fallbackOrder;
    }
    const seen = new Set(likedItemOrder.map(entry => `${entry.type}:${entry.id}`));
    const extras = fallbackOrder.filter(entry => !seen.has(`${entry.type}:${entry.id}`));
    return [...likedItemOrder, ...extras];
  }, [likedItemOrder, fallbackOrder]);

  const likedItems = useMemo(() => {
    const tandaMap = new Map(likedTandas.map(t => [t.id, t]));
    const cortinaMap = new Map(likedCortinas.map(c => [c.id, c]));
    return mergedOrder.map((entry) => {
      if (!entry) {
        return null;
      }
      if (entry.type === 'tanda') {
        const tanda = tandaMap.get(entry.id);
        if (!tanda) return null;
        return { // Tanda Item
          key: `tanda-${tanda.id}`,
          sortableId: tanda?.id ?? `tanda-${tanda.id}`,
          itemType: 'tanda',
          tanda,
        };
      }
      if (entry.type === 'cortina') {
        const cortina = cortinaMap.get(entry.id);
        if (!cortina) return null;
        const cortinaId = cortina.id ?? cortina.meta?.id;
        return { // Cortina Item
          key: `liked-cortina-${cortinaId}`,
          sortableId: cortinaId,
          itemType: 'cortina',
          cortina: cortina,
        };
      }
      return null;
    }).filter(Boolean);
  }, [likedTandas, likedCortinas, mergedOrder]);

  const scheduledCortinas = useMemo(() => {
    if (!settings.cortinas) return [];
    if (queueWithCurrent.length <= 1) return [];
    return queueWithCurrent.slice(1).map((tanda, index) => {
      const meta = tanda.cortinaMeta || null;
      const title = meta?.title || 'Cortina';
      const artist = meta?.artist || 'Unknown Artist';
      const genre = meta?.genre || meta?.style || meta?.category || 'Unknown Genre';
      const fallbackId = `tanda-${tanda?.id ?? 'unknown'}-slot-${index}`;
      const baseSource = [meta?.sortableId, meta?.id, meta?.cortina_id, meta?.slug, fallbackId].find(Boolean) || fallbackId;
      const baseSortableId = String(baseSource);
      const slotKey = tanda?.id != null ? `tanda-${tanda.id}` : `slot-${index}`;
      const sortableId = `scheduled-cortina-${baseSortableId}-for-${slotKey}`;
      return {
        key: sortableId,
        sortableId,
        order: index + 1,
        title,
        artist,
        genre,
        cortinaId: meta?.id || null,
        meta,
      };
    });
  }, [queueWithCurrent, settings.cortinas]);
  // 5. Callbacks
  const handlePause = useCallback(() => { if (audioRef.current) audioRef.current.pause(); }, []);
  const loadLibrary = useCallback(async (category) => {
    setIsRefreshing(true);
    if (!category) {
      generatorRef.current = null;
      setLibraryState(prev => ({
        buckets: null,
        metaById: {},
        loading: false,
        error: null,
        category: null,
        version: prev.version + 1,
      }));
      setIsRefreshing(false);
      return;
    }
    setLibraryState(prev => ({
      ...prev,
      loading: true,
      error: null,
      category,
    }));
    try {
      const res = await fetch(`/api/tandas/library?categoryFilter=${encodeURIComponent(category)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to load library (${res.status})`);
      }
      const data = await res.json();
      setError(null);
      setLibraryState(prev => ({
        buckets: {
          tangoMelodic: data.buckets?.tangoMelodic || [],
          tangoRhythmic: data.buckets?.tangoRhythmic || [],
          vals: data.buckets?.vals || [],
          milonga: data.buckets?.milonga || [],
        },
        metaById: data.metaById || {},
        loading: false,
        error: null,
        category,
        version: prev.version + 1,
      }));
    } catch (err) {
      console.error('Failed to load tanda library:', err);
      setLibraryState(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load tanda library.',
        version: prev.version + 1,
      }));
      setError(err?.message || 'Failed to load tanda library.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  useEffect(() => {
    loadLibrary(settings.categoryFilter);
  }, [loadLibrary, settings.categoryFilter]);
  const fetchLikedTandas = useCallback(async () => {
    if (likedTandaIds.length === 0) {
      setLikedTandas([]);
      return;
    }
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/tandas/by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tandaIds: likedTandaIds }),
      });
      if (!res.ok) throw new Error('Failed to fetch liked tandas');
      const data = await res.json();
      setLikedTandas(data.tandas || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [likedTandaIds]);
  const persistLikedOrdering = useCallback(async (order, tandaIds, cortinaIds) => {
    const payload = {
      tandaIds,
      cortinaIds,
      order: Array.isArray(order) ? order.map(entry => ({ type: entry.type, id: entry.id })) : [],
    };
    try {
      const res = await fetch('/api/users/liked-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error('Failed to persist liked order:', res.status);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.likedTandaIds)) updateLikedIds(data.likedTandaIds);
      if (Array.isArray(data.likedCortinaIds)) updateLikedCortinaIds(data.likedCortinaIds);
      if (Array.isArray(data.likedMixedOrder)) updateLikedMixedOrder(data.likedMixedOrder);
    } catch (error) {
      console.error('Failed to save liked order:', error);
    }
  }, [updateLikedIds, updateLikedCortinaIds, updateLikedMixedOrder]);

  const handleLikeToggle = useCallback(async (tandaId) => {
    if (!user || !tandaId) return;
    const baseOrder = likedItemOrder.length > 0 ? likedItemOrder : fallbackOrder;
    const previousOrder = baseOrder;
    const previousTandas = likedTandas;
    const isRemoving = localLikedIds.has(tandaId);
    const updatedSet = new Set(localLikedIds);
    let updatedTandas = likedTandas;
    let nextOrder = [...baseOrder];

    if (isRemoving) {
      updatedSet.delete(tandaId);
      updatedTandas = likedTandas.filter(t => t.id !== tandaId);
      nextOrder = nextOrder.filter(entry => !(entry.type === 'tanda' && entry.id === tandaId));
    } else {
      updatedSet.add(tandaId);
      if (!nextOrder.some(entry => entry.type === 'tanda' && entry.id === tandaId)) {
        nextOrder = [...nextOrder, { type: 'tanda', id: tandaId }];
      }
    }

    setLocalLikedIds(updatedSet);
    if (isRemoving) {
      setLikedTandas(updatedTandas);
    }
    setLikedItemOrder(nextOrder);
    syncLikedOrderToAuth(nextOrder);

    try {
      const res = await fetch('/api/users/like-tanda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tandaId }),
      });
      if (!res.ok) throw new Error('API call failed');
      const data = await res.json();
      updateLikedIds(Array.from(updatedSet));
      persistLikedOrdering(
        nextOrder,
        Array.from(updatedSet),
        Array.from(localLikedCortinaIds)
      );
    } catch (error) {
      console.error('Failed to sync like status:', error);
      setLocalLikedIds(new Set(likedTandaIds));
      setLikedTandas(previousTandas);
      const rollbackOrder = Array.isArray(likedMixedOrder) ? likedMixedOrder : previousOrder;
      setLikedItemOrder(rollbackOrder);
      syncLikedOrderToAuth(rollbackOrder);
    }

  }, [user, localLikedIds, localLikedCortinaIds, likedItemOrder, likedTandas, likedTandaIds, likedMixedOrder, fallbackOrder, updateLikedIds, syncLikedOrderToAuth, persistLikedOrdering]);
  const fetchAndFillPlaylist = useCallback(async (minBatch = 0) => {
    if (!cortinaPoolReady) return;
    if (isFetchingRef.current) return;
    const generator = generatorRef.current;
    if (!generator) return;

    const currentLength = upcomingPlaylistRef.current.length;
    let needed = PLAYLIST_REFILL_THRESHOLD - currentLength;
    if (currentLength === 0) {
      needed = Math.max(needed, PLAYLIST_REFILL_THRESHOLD);
    }
    needed = Math.max(needed, minBatch);
    if (needed <= 0) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const picks = [];
      for (let i = 0; i < needed; i += 1) {
        const pick = pickNextTandaId(generator);
        if (!pick) break;
        picks.push(pick);
      }

      if (picks.length === 0) {
        setError('No tandas available for this selection.');
        return;
      }

      const missingIds = picks
        .map(p => p.id)
        .filter(id => id && !generator.cache.has(id));

      if (missingIds.length > 0) {
        const response = await fetch('/api/tandas/by-ids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tandaIds: missingIds }),
        });
        if (!response.ok) {
          throw new Error('Failed to load tanda details.');
        }
        const data = await response.json();
        const tandas = Array.isArray(data.tandas) ? data.tandas : [];
        tandas.forEach(tanda => {
          if (tanda?.id) {
            generator.cache.set(tanda.id, tanda);
          }
        });
      }

      const tandaBatch = picks
        .map(p => generator.cache.get(p.id))
        .filter(Boolean);

      if (tandaBatch.length > 0) {
        let pool = shuffledCortinasRef.current;
        if (!Array.isArray(pool) || pool.length === 0) {
          pool = Array.isArray(cortinas) ? [...cortinas].sort(() => Math.random() - 0.5) : [];
          if (pool.length > 0) {
            setShuffledCortinas(pool);
          }
        }
        setUpcomingPlaylist(prev => {
          const existingManual = manualQueueRef.current;
          const existing = [...existingManual, ...prev];
          const wrapped = attachCortinas(existing, tandaBatch, pool);
          return [...prev, ...wrapped];
        });
        setError(null);
      }
    } catch (err) {
      console.error('QUEUE GENERATOR ERROR:', err);
      setError(err?.message || 'Failed to build queue.');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [cortinas, setShuffledCortinas, cortinaPoolReady]);
  const initAudioGraph = useCallback(() => {
    if (!shouldUseWebAudio || audioContextRef.current || !audioRef.current) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const source = context.createMediaElementSource(audioRef.current);
    const lowShelf = context.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 320; lowShelf.gain.value = eq.low;
    const midPeaking = context.createBiquadFilter(); midPeaking.type = 'peaking'; midPeaking.frequency.value = 1000; midPeaking.Q.value = 1; midPeaking.gain.value = eq.mid;
    const highShelf = context.createBiquadFilter(); highShelf.type = 'highshelf'; highShelf.frequency.value = 3200; highShelf.gain.value = eq.high;
    const masterGain = context.createGain(); masterGain.gain.value = Math.min(1, Math.max(0, Number(volumeRef.current)));
    source.connect(lowShelf); lowShelf.connect(midPeaking); midPeaking.connect(highShelf); highShelf.connect(masterGain); masterGain.connect(context.destination);
    if (audioRef.current) {
      try {
        audioRef.current.volume = 1;
      } catch {
        /* ignore readonly volume */
      }
    }
    audioContextRef.current = context;
    sourceNodeRef.current = source;
    lowShelfRef.current = lowShelf;
    midPeakingRef.current = midPeaking;
    highShelfRef.current = highShelf;
    masterGainRef.current = masterGain;
  }, [eq.low, eq.mid, eq.high, shouldUseWebAudio]);
  initAudioGraphRef.current = initAudioGraph;
  const handlePlay = useCallback(async () => {
    if (shouldUseWebAudio && !audioContextRef.current) initAudioGraph();
    const audioCtx = audioContextRef.current;
    if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
    if (audioRef.current?.src && audioRef.current.paused) {
      try { await audioRef.current.play(); } catch { setIsPlaying(false); }
    } else if (!currentTanda && !isLoading) {
      fetchAndFillPlaylist();
    }
  }, [currentTanda, isLoading, fetchAndFillPlaylist, initAudioGraph, shouldUseWebAudio]);
  const playNextTanda = useCallback(() => {
    const sourceTanda = manualQueue.length > 0 ? manualQueue[0] : upcomingPlaylist[0];
    if (!sourceTanda) { fetchAndFillPlaylist(); return; }
    setTandaHistory(prev => [sourceTanda, ...prev].slice(0, 50));
    setRecentlyPlayedIds(prev => new Set(prev).add(sourceTanda.id));
    setCurrentTrackIndex(0);
    autoplayIntentRef.current = true;
    if (manualQueue.length > 0) setManualQueue(prev => prev.slice(1));
    else setUpcomingPlaylist(prev => prev.slice(1));
  }, [manualQueue, upcomingPlaylist, fetchAndFillPlaylist]);
  const handleNextTandaClick = useCallback(async () => {
    setSkipMsg('');
    if (isPro) { playNextTanda(); return; }
    try {
      const res = await fetch('/api/usage/skip-tanda', { method: 'POST' });
      if (res.ok) { playNextTanda(); return; }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const resetAt = data?.resetAt ? formatHHMMLocal(data.resetAt) : '';
        setSkipMsg(`You?ve reached 3 tanda skips this hour. ${resetAt ? `Try again at ${resetAt}.` : 'Try again later.'}`);
        return;
      }
      if (res.status === 401) { setSkipMsg('Please sign in to skip tanda.'); return; }
      setSkipMsg('Unable to skip tanda right now.');
    } catch {
      setSkipMsg('Network error while skipping tanda.');
    }
  }, [isPro, playNextTanda]);
  const handleQueueScroll = useCallback(() => {
    if (queueContainerRef.current && !isFetchingRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = queueContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (isNearBottom) fetchAndFillPlaylist(PLAYLIST_REFILL_THRESHOLD);
    }
  }, [fetchAndFillPlaylist]);
  const handleSettingChange = useCallback((settingName, value) => {
    if (settings?.[settingName] === value) return;
    setSettings(prev => {
      if (prev?.[settingName] === value) return prev;
      return { ...prev, [settingName]: value };
    });
    if (settingName === 'categoryFilter') {
      if (value !== libraryState.category) {
        loadLibrary(value);
      }
    } else if (settingName === 'activeMode') {
      setIsRefreshing(true);
    }
  }, [libraryState.category, loadLibrary, settings]);
  const handleFullSequenceSelect = useCallback((value) => {
    if (!value) return;
    handleSettingChange('activeMode', value);
    setLastFullSequence(value);
  }, [handleSettingChange]);
  const handleSegmentSelect = useCallback((value) => {
    if (value === 'full') {
      const fallback = lastFullSequence || TANDA_ORDER_OPTIONS[0]?.value || '';
      if (fallback) handleFullSequenceSelect(fallback);
      return;
    }
    handleSettingChange('activeMode', value);
  }, [handleFullSequenceSelect, handleSettingChange, lastFullSequence]);
  const normalizeCortinaMeta = useCallback((meta, fallbackKey = null) => {
    if (!meta && !fallbackKey) return null;
    const normalized = { ...(meta || {}) };
    if (!normalized.id && fallbackKey) {
      normalized.id = fallbackKey;
    }
    if (!normalized.key && (normalized.id || fallbackKey)) {
      normalized.key = `cortina-${normalized.id || fallbackKey}`;
    }
    normalized.title = normalized.title || 'Cortina';
    normalized.artist = normalized.artist || normalized.performer || '';
    normalized.genre = normalized.genre || normalized.style || normalized.category || '';
    if (!normalized.artwork_url_signed && normalized.artwork) {
      normalized.artwork_url_signed = normalized.artwork;
    }
    normalized.playableUrl = normalized.playableUrl || normalized.url_signed || normalized.playable_url_signed || null;

    const parsedStart = Number(normalized.startTime);
    const safeStart = Number.isFinite(parsedStart) && parsedStart >= 0 ? parsedStart : 0;
    normalized.startTime = safeStart;

    const parsedEnd = Number(normalized.endTime);
    const safeEnd = Number.isFinite(parsedEnd) && parsedEnd > safeStart ? parsedEnd : null;
    normalized.endTime = safeEnd;

    return normalized;
  }, []);
  const fetchLikedCortinas = useCallback(async () => {
    if (!likedCortinaIds || likedCortinaIds.length === 0) {
      setLikedCortinas([]);
      return;
    }
    try {
      const res = await fetch('/api/cortinas/by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cortinaIds: likedCortinaIds }),
      });
      if (!res.ok) throw new Error('Failed to fetch liked cortinas');
      const data = await res.json();
      const entries = (data.cortinas || []).map((item) => {
        const normalized = normalizeCortinaMeta(item, item?.id);
        if (!normalized?.id) return null;
        return {
          id: normalized.id,
          key: `cortina-liked-${normalized.id}`,
          title: normalized.title,
          artist: normalized.artist,
          genre: normalized.genre,
          artwork: normalized.artwork_url_signed || normalized.artwork || '/default-artwork.png',
          meta: normalized,
        };
      }).filter(Boolean);
      setLikedCortinas(entries);
    } catch (error) {
      console.error(error);
    }
  }, [likedCortinaIds, normalizeCortinaMeta]);

  const updateCortinaMetas = useCallback((mutator) => {
    const manualCount = manualQueue.length;
    const combined = manualCount > 0 ? [...manualQueue, ...upcomingPlaylist] : [...upcomingPlaylist];
    if (combined.length <= 1) return;
    const metas = combined.slice(1).map(item => item?.cortinaMeta || null);
    let nextMetas = mutator ? mutator([...metas]) : metas;
    if (!Array.isArray(nextMetas)) {
      nextMetas = metas;
    }
    if (nextMetas.length < metas.length) {
      nextMetas = [...nextMetas, ...metas.slice(nextMetas.length)];
    } else if (nextMetas.length > metas.length) {
      nextMetas = nextMetas.slice(0, metas.length);
    }
    const rebuiltCombined = combined.map((tanda, idx) => {
      if (idx === 0) return { ...tanda };
      return { ...tanda, cortinaMeta: nextMetas[idx - 1] || null };
    });
    if (manualCount > 0) {
      setManualQueue(rebuiltCombined.slice(0, manualCount));
      setUpcomingPlaylist(rebuiltCombined.slice(manualCount));
    } else {
      setManualQueue([]);
      setUpcomingPlaylist(rebuiltCombined);
    }
    setShuffledCortinas(prev => {
      if (!prev || prev.length === 0) return prev;
      const seen = new Set();
      const ordered = [];
      nextMetas.forEach(meta => {
        const id = meta?.id;
        if (!id || seen.has(id)) return;
        const match = prev.find(item => item.id === id) || meta;
        if (match) {
          ordered.push(match);
          seen.add(id);
        }
      });
      const rest = prev.filter(item => !seen.has(item.id));
      return ordered.length > 0 ? [...ordered, ...rest] : prev;
    });
  }, [manualQueue, upcomingPlaylist, setManualQueue, setUpcomingPlaylist, setShuffledCortinas]);

  const insertCortinaMeta = useCallback((meta, position = 0, fallbackKey = null) => {
    const normalized = normalizeCortinaMeta(meta, fallbackKey);
    if (!normalized) return;
    updateCortinaMetas((metas) => {
      if (!metas || metas.length === 0) return metas;
      const filtered = normalized.id ? metas.filter(item => !(item?.id === normalized.id)) : [...metas];
      const targetIndex = Number.isFinite(position) ? Math.max(0, Math.min(position, filtered.length)) : filtered.length;
      filtered.splice(targetIndex, 0, normalized);
      return filtered;
    });
  }, [normalizeCortinaMeta, updateCortinaMetas]);

  const handleCortinaLikeToggle = useCallback((meta, fallbackKey = null) => {
    if (!user) {
      requireAuth(() => handleCortinaLikeToggle(meta, fallbackKey));
      return;
    }
    const normalized = normalizeCortinaMeta(meta, fallbackKey);
    if (!normalized?.id) return;
    const cortinaId = normalized.id;
    const wasLiked = localLikedCortinaIds.has(cortinaId);
    const entry = {
      id: normalized.id,
      key: `cortina-liked-${normalized.id}`,
      title: normalized.title,
      artist: normalized.artist,
      genre: normalized.genre,
      artwork: normalized.artwork_url_signed || normalized.artwork || '/default-artwork.png',
      meta: normalized,
    };

    const updatedCortinaSet = new Set(localLikedCortinaIds);
    const baseOrder = likedItemOrder.length > 0 ? likedItemOrder : fallbackOrder;
    const previousOrder = baseOrder;
    const previousCortinas = likedCortinas;
    let nextOrder = [...baseOrder];

    if (wasLiked) {
      updatedCortinaSet.delete(cortinaId);
      setLikedCortinas(prev => prev.filter(item => item.id !== cortinaId));
      nextOrder = nextOrder.filter(entry => !(entry.type === 'cortina' && entry.id === cortinaId));
    } else {
      updatedCortinaSet.add(cortinaId);
      if (!likedCortinas.some(item => item.id === cortinaId)) {
        setLikedCortinas(prev => [...prev, entry]);
      }
      if (!nextOrder.some(entry => entry.type === 'cortina' && entry.id === cortinaId)) {
        nextOrder = [...nextOrder, { type: 'cortina', id: cortinaId }];
      }
    }

    const nextTandaIds = nextOrder.filter(entry => entry.type === 'tanda').map(entry => entry.id);
    const nextCortinaIds = nextOrder.filter(entry => entry.type === 'cortina').map(entry => entry.id);

    setLocalLikedCortinaIds(updatedCortinaSet);
    setLikedItemOrder(nextOrder);
    syncLikedOrderToAuth(nextOrder);

    (async () => {
      try {
        const res = await fetch('/api/users/like-cortina', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cortinaId }),
        });
        if (!res.ok) throw new Error('Failed to toggle cortina like');
        const data = await res.json();
        updateLikedCortinaIds(nextCortinaIds);
        persistLikedOrdering(nextOrder, nextTandaIds, nextCortinaIds);
      } catch (error) {
        console.error('Failed to sync cortina like status:', error);
        setLocalLikedCortinaIds(new Set(localLikedCortinaIds));
        setLikedCortinas(previousCortinas);
        const rollbackOrder = Array.isArray(likedMixedOrder) ? likedMixedOrder : previousOrder;
        setLikedItemOrder(rollbackOrder);
        syncLikedOrderToAuth(rollbackOrder);
      }
    })();

  }, [user, requireAuth, normalizeCortinaMeta, localLikedCortinaIds, likedItemOrder, likedCortinas, likedMixedOrder, fallbackOrder, updateLikedCortinaIds, syncLikedOrderToAuth, persistLikedOrdering]);

  const reorderCortinas = useCallback((fromIndex, toIndex) => {
    updateCortinaMetas((metas) => {
      if (!Array.isArray(metas)) return metas;
      if (fromIndex < 0 || fromIndex >= metas.length || toIndex < 0 || toIndex >= metas.length || fromIndex === toIndex) {
        return metas;
      }
      return arrayMove(metas, fromIndex, toIndex);
    });
  }, [updateCortinaMetas]);
  const handleCortinaDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const ids = scheduledCortinas.map(item => item.sortableId || item.key);
    const fromIndex = ids.indexOf(active.id);
    const toIndex = ids.indexOf(over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    reorderCortinas(fromIndex, toIndex);
  }, [scheduledCortinas, reorderCortinas]);

  const handleDragCancel = useCallback(() => {
    setActiveDragItem(null);

  }, []);
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const allQueueTandas = [...manualQueue, ...upcomingPlaylist];
    const allLikedItems = likedItems;
    const allScheduledCortinas = scheduledCortinas;

    let item = allQueueTandas.find(t => t.id === active.id);
    if (item) { setActiveDragItem({ type: 'tanda', data: item }); return; }

    item = allLikedItems.find(i => i.sortableId === active.id);
    if (item) { setActiveDragItem({ type: item.itemType, data: item.itemType === 'tanda' ? item.tanda : item.cortina }); return; }

    item = allScheduledCortinas.find(c => c.key === active.id);
    if (item) { setActiveDragItem({ type: 'cortinaRow', data: item }); return; }

  }, [manualQueue, upcomingPlaylist, likedItems, scheduledCortinas]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragItem(null);
    if (!over || active.id === over.id) return;
    const draggedTanda = [...manualQueue, ...upcomingPlaylist].find(t => t.id === active.id);
    if (!draggedTanda) return;
    const isActiveInManual = manualQueue.some(t => t.id === active.id);
    const isOverInManual = manualQueue.some(t => t.id === over.id);
    const isOverInUpcoming = upcomingPlaylist.some(t => t.id === over.id);
    if (isActiveInManual && isOverInManual) {
      setManualQueue(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    } else if (!isActiveInManual && isOverInManual) {
      setUpcomingPlaylist(prev => prev.filter(t => t.id !== active.id));
      setManualQueue(items => {
        const overIndex = items.findIndex(item => item.id === over.id);
        return [...items.slice(0, overIndex), draggedTanda, ...items.slice(overIndex)];
      });
    } else if (!isActiveInManual && isOverInUpcoming) {
      const oldIndex = upcomingPlaylist.findIndex(t => t.id === active.id);
      const newIndex = upcomingPlaylist.findIndex(t => t.id === over.id);
      if (manualQueue.length === 0 && newIndex === 0 && oldIndex > 0) {
        setUpcomingPlaylist(prev => prev.filter(t => t.id !== active.id));
        setManualQueue(items => [draggedTanda, ...items]);
      } else {
        setUpcomingPlaylist(items => arrayMove(items, oldIndex, newIndex));
      }
    }
  };
  const handleLikedDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveDragItem(null);
    if (!over || active.id === over.id) return;
    const activeIndex = likedItems.findIndex(item => item.sortableId === active.id);
    const overIndex = likedItems.findIndex(item => item.sortableId === over.id);
    if (activeIndex === -1 || overIndex === -1) return;
    const reordered = arrayMove(likedItems, activeIndex, overIndex);
    const nextTandas = [];
    const nextCortinas = [];
    const nextOrder = [];
    reordered.forEach(item => {
      if (item.itemType === 'tanda') {
        nextTandas.push(item.tanda);
        nextOrder.push({ type: 'tanda', id: item.tanda.id });
      } else if (item.itemType === 'cortina') {
        const cortinaId = item.cortina?.id || item.cortina?.meta?.id;
        if (!cortinaId) return;
        nextCortinas.push(item.cortina);
        nextOrder.push({ type: 'cortina', id: cortinaId });
      }
    });
    const tandaIds = nextOrder.filter(entry => entry.type === 'tanda').map(entry => entry.id);
    const cortinaIds = nextOrder.filter(entry => entry.type === 'cortina').map(entry => entry.id);
    setLikedTandas(nextTandas);
    setLikedCortinas(nextCortinas);
    setLikedItemOrder(nextOrder);
    syncLikedOrderToAuth(nextOrder);
    updateLikedIds(tandaIds);
    updateLikedCortinaIds(cortinaIds);
    persistLikedOrdering(nextOrder, tandaIds, cortinaIds);
  }, [likedItems, updateLikedIds, updateLikedCortinaIds, syncLikedOrderToAuth, persistLikedOrdering]);
  const handleAddToQueue = useCallback((tandaToAdd) => {

    if (manualQueue.some(t => t.id === tandaToAdd.id)) return;

    let newManualQueue = [...manualQueue];

    let newUpcomingPlaylist = [...upcomingPlaylist];

    newUpcomingPlaylist = newUpcomingPlaylist.filter(t => t.id !== tandaToAdd.id);

    if (newManualQueue.length > 0) {

      newManualQueue.push(tandaToAdd);

    } else {

      if (currentTanda) {

        newUpcomingPlaylist = newUpcomingPlaylist.filter(t => t.id !== currentTanda.id);

        if (currentTanda.id === tandaToAdd.id) newManualQueue = [currentTanda];

        else newManualQueue = [currentTanda, tandaToAdd];

      } else {

        newManualQueue = [tandaToAdd];

      }

    }

    setManualQueue(newManualQueue);

    setUpcomingPlaylist(newUpcomingPlaylist);

  }, [manualQueue, upcomingPlaylist, currentTanda, setManualQueue, setUpcomingPlaylist]);


  const handlePlayNext = useCallback((tandaToPlayNext) => {

    if (!currentTanda || currentTanda.id === tandaToPlayNext.id) {

      if (!currentTanda) handleAddToQueue(tandaToPlayNext);

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

  }, [currentTanda, handleAddToQueue, manualQueue, upcomingPlaylist, setManualQueue, setUpcomingPlaylist]);



  const handlePlayNow = useCallback((tandaToPlay) => {
    if (currentTanda?.id === tandaToPlay.id) return;
    if (currentTanda) {
      setTandaHistory(prev => [currentTanda, ...prev].slice(0, 50));
      setRecentlyPlayedIds(prev => new Set(prev).add(currentTanda.id));
    }
    const allOtherTandas = [...manualQueue, ...upcomingPlaylist].filter(t => t.id !== tandaToPlay.id);
    setManualQueue([tandaToPlay]);
    setUpcomingPlaylist(allOtherTandas);
    setCurrentTrackIndex(0);
    autoplayIntentRef.current = true;
  }, [currentTanda, manualQueue, upcomingPlaylist]);
  const handleCortinaEnded = useCallback(() => {
    if (!isCortinaPlayingRef.current) return;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // ignore pause errors
      }
    }
    clearCortinaTimeout();
    setIsCortinaPlaying(false);
    setCurrentCortina(null);
    playNextTanda();
  }, [clearCortinaTimeout, playNextTanda]);

  useEffect(() => {
    return () => clearCortinaTimeout();
  }, [clearCortinaTimeout]);


  useEffect(() => {
    isCortinaPlayingRef.current = isCortinaPlaying;
  }, [isCortinaPlaying]);

  const handleTrackEnded = useCallback(() => {
    const totalTracks = currentTanda?.tracks_signed?.length || 0;
    const lengthRule = (currentTanda?.type === 'Tango') ? settings.tandaLength : 3;
    const isLastTrackOfTanda = currentTrackIndex >= Math.min(totalTracks, lengthRule) - 1;
    if (isLastTrackOfTanda) {
      if (settings.cortinas) {
        const plannedMeta = scheduledCortinas[0]?.meta;
        let resolvedCortina = null;
        if (plannedMeta?.id) {
          resolvedCortina = cortinas.find(c => c.id === plannedMeta.id) || null;
        }
        if (!resolvedCortina && plannedMeta) {
          const playableUrl = plannedMeta.playableUrl || plannedMeta.url_signed || plannedMeta.playable_url_signed || null;
          if (playableUrl) {
            resolvedCortina = { ...plannedMeta, playableUrl };
          }
        }
        if (!resolvedCortina && cortinas.length > 0) {
          resolvedCortina = cortinas[Math.floor(Math.random() * cortinas.length)];
        }
        clearCortinaTimeout();
        if (resolvedCortina?.playableUrl) {
          setCurrentCortina(resolvedCortina);
          setIsCortinaPlaying(true);
          setCurrentCortinaFull(settings.cortinaFullLength);
          const audio = audioRef.current;
          if (audio) {
            const playFullCortina = !!settings.cortinaFullLength;
            const startPosition = !playFullCortina && typeof resolvedCortina.startTime === 'number' && resolvedCortina.startTime >= 0
              ? resolvedCortina.startTime
              : 0;
            const endPosition = !playFullCortina && typeof resolvedCortina.endTime === 'number' && resolvedCortina.endTime > startPosition
              ? resolvedCortina.endTime
              : null;
            const fadeInDuration = fadeConfigRef.current.fadeIn;
            const fadeOutDuration = fadeConfigRef.current.fadeOut;

            const applyPlaybackParams = () => {
              try {
                audio.currentTime = startPosition;
              } catch {
                // Some browsers may throw if metadata isn't ready yet; ignore.
              }
              cancelCortinaFade();
              cortinaFadeOutStartedRef.current = false;
              cortinaEndTimeRef.current = null;
              const targetVolume = Math.min(1, Math.max(0, volumeRef.current));
              if (fadeInDuration > 0 && targetVolume > 0) {
                setEffectiveVolume(0);
                audio.muted = false;
                startCortinaFade(targetVolume, fadeInDuration);
              } else {
                setEffectiveVolume(targetVolume);
                audio.muted = false;
              }

              if (endPosition !== null) {
                cortinaEndTimeRef.current = endPosition;
                const onTimeUpdate = () => {
                  if (!audioRef.current) return;
                  if (typeof cortinaEndTimeRef.current === 'number') {
                    const remaining = cortinaEndTimeRef.current - audioRef.current.currentTime;
                    if (!cortinaFadeOutStartedRef.current && fadeOutDuration > 0 && remaining <= fadeOutDuration) {
                      cortinaFadeOutStartedRef.current = true;
                      const fadeDuration = Math.max(0, Math.min(fadeOutDuration, Math.max(remaining, 0)));
                      startCortinaFade(0, fadeDuration, handleCortinaEnded);
                    }
                    if (audioRef.current.currentTime >= cortinaEndTimeRef.current - 0.05) {
                      handleCortinaEnded();
                    }
                  }
                };
                if (cortinaTimeUpdateHandlerRef.current && audio.removeEventListener) {
                  audio.removeEventListener('timeupdate', cortinaTimeUpdateHandlerRef.current);
                }
                audio.addEventListener('timeupdate', onTimeUpdate);
                cortinaTimeUpdateHandlerRef.current = onTimeUpdate;
                const remainingMs = Math.max(0, (endPosition - Math.max(startPosition, audio.currentTime)) * 1000);
                if (remainingMs > 0) {
                  if (cortinaTimeoutRef.current) clearTimeout(cortinaTimeoutRef.current);
                  cortinaTimeoutRef.current = setTimeout(() => {
                    handleCortinaEnded();
                  }, remainingMs);
                } else {
                  handleCortinaEnded();
                }
              }
              audio.play().catch(e => console.error('Error playing cortina:', e));
            };

            audio.src = resolvedCortina.playableUrl;

            if (audio.readyState >= 1) {
              // Metadata already available; apply immediately.
              applyPlaybackParams();
            } else {
              audio.onloadedmetadata = () => {
                audio.onloadedmetadata = null;
                applyPlaybackParams();
              };
              audio.load();
            }
          }
        } else {
          playNextTanda();
        }
      } else {
        playNextTanda();
      }
    } else {
      autoplayIntentRef.current = true;
      setCurrentTrackIndex(prev => prev + 1);
    }
  }, [
    currentTanda,
    currentTrackIndex,
    settings.tandaLength,
    settings.cortinas,
    settings.cortinaFullLength,
    scheduledCortinas,
    cortinas,
    playNextTanda,
    clearCortinaTimeout,
    handleCortinaEnded,
    startCortinaFade,
    setEffectiveVolume,
    cancelCortinaFade,
    setCurrentCortinaFull,
  ]);
  const handleRefreshPlaylist = useCallback(() => {
    if (isFetchingRef.current) return;
    const context = buildGeneratorContext(libraryState, settings.activeMode, MIN_SAME_ORCHESTRA_GAP);
    generatorRef.current = context;
    isResettingRef.current = true;
    setIsRefreshing(true);
    setResetCounter(c => c + 1);
  }, [libraryState, settings.activeMode]);
  const handleSkipForward = useCallback(() => {
    if (user && !isPro) return;
    if (isCortinaPlaying) {
      handleCortinaEnded();
      return;
    }
    if (!currentTanda) return;
    const totalTracks = currentTanda.tracks_signed?.length || 0;
    const effectiveLength = (currentTanda.type === 'Tango') ? settings.tandaLength : 3;
    if (currentTrackIndex < Math.min(totalTracks, effectiveLength) - 1) {
      setCurrentTrackIndex(prev => prev + 1);
      autoplayIntentRef.current = isPlaying;
    } else {
      playNextTanda();
    }
  }, [isPro, currentTanda, currentTrackIndex, settings.tandaLength, isPlaying, playNextTanda, isCortinaPlaying, handleCortinaEnded, user]);
  const handleSkipBackward = useCallback(() => {
    if (user && !isPro) return;
    if (!currentTanda || !audioRef.current) return;
    const RESTART_THRESHOLD_SECONDS = 3;
    if (audioRef.current.currentTime > RESTART_THRESHOLD_SECONDS || currentTrackIndex === 0) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else {
      setCurrentTrackIndex(prevIndex => prevIndex - 1);
      autoplayIntentRef.current = isPlaying;
    }
  }, [isPro, currentTanda, currentTrackIndex, isPlaying, user]);
  const handleRewind = useCallback(() => {
    if (tandaHistory.length === 0) return;
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
  const handlePlayFullCurrentCortina = useCallback(() => {
    if (!isCortinaPlaying || !currentCortina || !audioRef.current) return;
    setCurrentCortinaFull(true);
    const audio = audioRef.current;
    if (cortinaTimeUpdateHandlerRef.current && audio.removeEventListener) {
      audio.removeEventListener('timeupdate', cortinaTimeUpdateHandlerRef.current);
      cortinaTimeUpdateHandlerRef.current = null;
    }
    if (cortinaTimeoutRef.current) {
      clearTimeout(cortinaTimeoutRef.current);
      cortinaTimeoutRef.current = null;
    }
    cortinaEndTimeRef.current = null;
    cortinaFadeOutStartedRef.current = false;
    cancelCortinaFade();
    const targetVolume = Math.min(1, Math.max(0, volumeRef.current));
    setEffectiveVolume(targetVolume);
    audio.muted = false;
  }, [isCortinaPlaying, currentCortina, cancelCortinaFade, setEffectiveVolume, setCurrentCortinaFull]);
  const handleResetEq = useCallback(() => {
    if (user && !isPro) return;
    const newEq = { low: 0, mid: 0, high: 0 };
    setEq(newEq);
    if (isDesktop && audioContextRef.current) {
      const audioCtx = audioContextRef.current;
      if (lowShelfRef.current) lowShelfRef.current.gain.setTargetAtTime(newEq.low, audioCtx.currentTime, 0.01);
      if (midPeakingRef.current) midPeakingRef.current.gain.setTargetAtTime(newEq.mid, audioCtx.currentTime, 0.01);
      if (highShelfRef.current) highShelfRef.current.gain.setTargetAtTime(newEq.high, audioCtx.currentTime, 0.01);
    }
  }, [isPro, isDesktop, user]);
  const handlePanelToggle = (panelName) => {
    const isOpening = activePanel !== panelName;
    if (panelName === 'queue' && isOpening) fetchAndFillPlaylist();
    setActivePanel(prev => prev === panelName ? null : panelName);
  };
  const handleEqChange = useCallback((band, value) => {
    if (user && !isPro) return;
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
  }, [isDesktop, isPro, user]);
  const openContextMenu = useCallback((event, extraState) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget instanceof Element ? event.currentTarget : null;
    const nativeEvent = event.nativeEvent || event;
    const scrollX = typeof window !== 'undefined' ? (window.scrollX || window.pageXOffset || 0) : 0;
    const scrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;
    let x = (nativeEvent.clientX ?? nativeEvent.pageX ?? 0) + scrollX;
    let y = (nativeEvent.clientY ?? nativeEvent.pageY ?? 0) + scrollY;
    let anchorRect = null;
    const placement = 'left';
    const verticalAlign = 'top';
    const horizontalAlign = 'left';
    const offset = 12;
    const offsetY = 0;
    if (target) {
      const rect = target.getBoundingClientRect();
      anchorRect = {
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
        left: rect.left + scrollX,
        right: rect.right + scrollX,
        width: rect.width,
        height: rect.height,
      };
      x = anchorRect.left - offset;
      y = anchorRect.top;
    }
    setMenuState({
      visible: true,
      x,
      y,
      anchorRect,
      placement,
      verticalAlign,
      horizontalAlign,
      offset,
      offsetY,
      itemType: extraState.itemType,
      tandaId: extraState.tandaId ?? null,
      cortinaKey: extraState.cortinaKey ?? null,
      cortinaMeta: extraState.cortinaMeta ?? null,
    });
  }, []);
  const handleMenuOpen = useCallback((event, tanda) => {
    openContextMenu(event, { itemType: 'tanda', tandaId: tanda.id });
  }, [openContextMenu]);
  const handleCortinaMenuOpen = useCallback((event, item) => {
    openContextMenu(event, { itemType: 'cortina', cortinaKey: item.key, cortinaMeta: item.meta || null });
  }, [openContextMenu]);
  const handleMenuClose = useCallback(() => {
    setMenuState(prev => ({ ...prev, visible: false }));
  }, []);
  const handleTandaMenuAction = useCallback((action) => {
    if (menuState.itemType !== 'tanda') return;
    const tanda = [...manualQueue, ...upcomingPlaylist].find(t => t.id === menuState.tandaId);
    if (tanda) action(tanda);
    handleMenuClose();
  }, [manualQueue, upcomingPlaylist, menuState.itemType, menuState.tandaId, handleMenuClose]);
  const handleCortinaMenuMove = useCallback((targetIndex) => {
    const ids = scheduledCortinas.map(item => item.sortableId || item.key);
    const currentIndex = menuState.cortinaKey ? ids.indexOf(menuState.cortinaKey) : -1;
    if (currentIndex === -1 || targetIndex === null || targetIndex === undefined || currentIndex === targetIndex) return;
    reorderCortinas(currentIndex, targetIndex);
    handleMenuClose();
  }, [scheduledCortinas, menuState.cortinaKey, reorderCortinas, handleMenuClose]);
  const handleSeek = (event) => { if (audioRef.current?.duration) { const seekTime = Number(event.target.value); audioRef.current.currentTime = seekTime; setCurrentTime(seekTime); } };
  const handleProgressClick = useCallback((event) => { if (!audioRef.current || !duration) return; const barElement = event.currentTarget; const rect = barElement.getBoundingClientRect(); const clickX = event.clientX - rect.left; const seekTime = (clickX / rect.width) * duration; audioRef.current.currentTime = seekTime; setCurrentTime(seekTime); }, [duration]);
  const handleSeekingStart = () => { isSeekingRef.current = true; };
  const handleSeekingEnd = () => { isSeekingRef.current = false; };
  const handleVolumeChange = (event) => {
    if (!event?.target) return;
    const newVolume = Number(event.target.value);
    const sanitized = Math.min(1, Math.max(0, newVolume));
    setVolume(sanitized);
    volumeRef.current = sanitized;
    if (masterGainRef.current && audioContextRef.current) {
      try {
        masterGainRef.current.gain.setTargetAtTime(sanitized, audioContextRef.current.currentTime, 0.01);
      } catch {
        masterGainRef.current.gain.value = sanitized;
      }
      if (audioRef.current) {
        try {
          audioRef.current.volume = 1;
        } catch {
          /* ignore readonly volume */
        }
      }
    } else if (audioRef.current) {
      try {
        audioRef.current.volume = sanitized;
      } catch {
        /* ignore readonly volume */
      }
    }
  };
  const renderVerticalVolumeSlider = (currentVolume, setVolumeFunctionCallback) => { const volumePercentage = currentVolume * 100; const KNOB_DISPLAY_HEIGHT_PX = 12; const thumbOffsetPx = KNOB_DISPLAY_HEIGHT_PX / 2; const thumbTopPosition = `calc(${(1 - currentVolume) * 100}% - ${thumbOffsetPx}px)`; return (<div className="flex flex-col items-center justify-center h-64 w-16 bg-[url('/images/volumeback.png')] bg-contain bg-no-repeat bg-center p-1 rounded-md shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]"><div className="relative w-1 h-[80%] bg-[#222429] rounded-full shadow-inner cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const clickY = e.clientY - rect.top; let newVolume = Math.max(0, Math.min(1, 1 - (clickY / rect.height))); setVolumeFunctionCallback({ target: { value: newVolume.toString() } }); }}><div className="absolute bottom-0 left-0 w-full bg-[#25edda] rounded-b-full pointer-events-none" style={{ height: `${volumePercentage}%` }} /><div className="absolute left-1/2 -translate-x-1/2 w-8 h-3 rounded-md bg-[#30333a] shadow-[3px_3px_3px_#222429,-3px_-3px_3px_#3e424b] pointer-events-none" style={{ top: thumbTopPosition }} /><input type="range" min="0" max="1" step="0.01" value={currentVolume} onChange={setVolumeFunctionCallback} className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }} aria-label="Volume" /></div></div>); };
  const handleAudioTimeUpdate = useCallback(() => { if (audioRef.current && !isSeekingRef.current) setCurrentTime(audioRef.current.currentTime); }, []);
  const handleAudioLoadedMetadata = useCallback(() => { if (audioRef.current) setDuration(audioRef.current.duration); }, []);
  const handleAudioPlay = useCallback(() => setIsPlaying(true), []);
  const handleAudioPause = useCallback(() => setIsPlaying(false), []);
  const toggleSidebars = useCallback(() => { setSidebarsVisible(prev => !prev); }, []);
  // 6. Effects
  useEffect(() => {
  setHasMounted(true);
  const mediaQuery = window.matchMedia('(min-width: 1024px)');
  const handleChange = () => setIsDesktop(mediaQuery.matches);
  handleChange();
  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange); }, []);
  useEffect(() => {
    if (!Array.isArray(likedMixedOrder)) return;
    setLikedItemOrder(prev => {
      const prevKey = JSON.stringify(prev);
      const nextKey = JSON.stringify(likedMixedOrder);
      if (prevKey === nextKey) return prev;
      return likedMixedOrder;
    });
  }, [likedMixedOrder]);
  useEffect(() => {
    setLocalLikedCortinaIds(new Set(Array.isArray(likedCortinaIds) ? likedCortinaIds : []));
  }, [likedCortinaIds]);
  useEffect(() => {
    // Keep the cached liked queue in sync once auth profile is ready.
    if (!user) {
      setLikedTandas([]);
      setLikedCortinas([]);
      setLocalLikedIds(new Set());
      setLocalLikedCortinaIds(new Set());
      setLikedItemOrder([]);
      return;
    }
    if (likedTandaIds && likedTandaIds.length > 0) {
      fetchLikedTandas();
    } else {
      setLikedTandas([]);
    }
    if (likedCortinaIds && likedCortinaIds.length > 0) {
      fetchLikedCortinas();
    } else {
      setLikedCortinas([]);
    }
  }, [user, likedTandaIds, likedCortinaIds, fetchLikedTandas, fetchLikedCortinas]);
  useEffect(() => {
    setLocalLikedIds(new Set(likedTandaIds));
  }, [likedTandaIds]);
  useEffect(() => {
    const currentTrack = currentTanda?.tracks_signed?.[currentTrackIndex];
    if ('mediaSession' in navigator && currentTanda && currentTrack) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTanda.orchestra,
        album: `${currentTanda.singer || 'Instrumental'} - ${currentTanda.type}`,
        artwork: [{ src: currentTanda.artwork_signed, sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', handlePlay);
      navigator.mediaSession.setActionHandler('pause', handlePause);
      navigator.mediaSession.setActionHandler('previoustrack', isPro ? handleSkipBackward : null);
      navigator.mediaSession.setActionHandler('nexttrack', isPro ? handleSkipForward : null);
    }
  }, [currentTanda, currentTrackIndex, handlePlay, handlePause, handleSkipBackward, handleSkipForward, isPro]);
  useEffect(() => {
    if (resetCounter > 0) {
      setUpcomingPlaylist([]);
      setManualQueue([]);
      setRecentlyPlayedIds(new Set());
    }
  }, [resetCounter]);
  useEffect(() => {
    const fetchCortinas = async () => {
      try {
        const response = await fetch('/api/cortinas/player');
        if (response.ok) {
          const data = await response.json();
          const fetchedCortinas = Array.isArray(data.cortinas) ? data.cortinas : [];
          setCortinas(fetchedCortinas);
          if (data.settings) {
            const fadeInSeconds = Math.max(0, Number(data.settings.fadeInSeconds) || 0);
            const fadeOutSeconds = Math.max(0, Number(data.settings.fadeOutSeconds) || 0);
            fadeConfigRef.current = {
              fadeIn: fadeInSeconds,
              fadeOut: fadeOutSeconds,
            };
          }
        } else {
          console.error('Failed to fetch cortinas:', response.status);
          setCortinas([]);
        }
      } catch (error) {
        console.error('Failed to fetch cortinas:', error);
        setCortinas([]);
      } finally {
        setCortinaPoolReady(true);
      }
    };
    fetchCortinas();
  }, []);
  useEffect(() => {
    if (!Array.isArray(cortinas) || cortinas.length === 0) return;
    setShuffledCortinas(prev => {
      if (Array.isArray(prev) && prev.length === cortinas.length) return prev;
      const randomized = [...cortinas].sort(() => Math.random() - 0.5);
      shuffledCortinasRef.current = randomized;
      return randomized;
    });
  }, [cortinas]);
  useEffect(() => {
    if (!cortinaPoolReady) return;
    const pool = (Array.isArray(shuffledCortinasRef.current) && shuffledCortinasRef.current.length > 0)
      ? shuffledCortinasRef.current
      : (Array.isArray(cortinas) ? [...cortinas] : []);
    if (!Array.isArray(pool) || pool.length === 0) return;

    setManualQueue(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      let changed = false;
      const updated = prev.map((tanda, idx) => {
        if (tanda?.cortinaMeta) return tanda;
        const meta = pool[idx % pool.length];
        if (!meta) return tanda;
        changed = true;
        return { ...tanda, cortinaMeta: meta };
      });
      return changed ? updated : prev;
    });

    setUpcomingPlaylist(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      const manualCount = manualQueueRef.current?.length || 0;
      let changed = false;
      const updated = prev.map((tanda, idx) => {
        if (tanda?.cortinaMeta) return tanda;
        const meta = pool[(manualCount + idx) % pool.length];
        if (!meta) return tanda;
        changed = true;
        return { ...tanda, cortinaMeta: meta };
      });
      return changed ? updated : prev;
    });
  }, [cortinaPoolReady, cortinas]);
  useEffect(() => {
    if (!cortinaPoolReady) return;
    const needsFetching = upcomingPlaylist.length === 0 || upcomingPlaylist.length < PLAYLIST_REFILL_THRESHOLD;
    if (needsFetching && !isFetchingRef.current && !isChangingSettings) {
      fetchAndFillPlaylist();
    }
  }, [upcomingPlaylist.length, resetCounter, fetchAndFillPlaylist, isChangingSettings, cortinaPoolReady]);
  useEffect(() => {
    if (isCortinaPlaying) {
      return;
    }

    const trackUrl = currentTanda?.tracks_signed?.[currentTrackIndex]?.url_signed;
    if (!trackUrl || !audioRef.current) {
      return;
    }

    if (audioRef.current.src !== trackUrl) {
      audioRef.current.src = trackUrl;
      audioRef.current.load();
    }

    isResettingRef.current = false;
    if (autoplayIntentRef.current) {
      autoplayIntentRef.current = false;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTanda, currentTrackIndex, isCortinaPlaying]);
  useEffect(() => { // Demo timer for non-pro users
    // If the user is logged in, or if music isn't playing, we don't need a timer.
    if (user || !isPlaying) {
      return;
    }
    // When a logged-out user starts playback, set a timer.
    const demoTimer = setTimeout(() => {
      handlePause(); // Pause the music as requested
      requireAuth(() => {
        // After successful login, resume playback
        handlePlay();
      });
    }, 5000); // 5 seconds in milliseconds
    // This is a cleanup function to cancel the timer if the user pauses or the component changes
    return () => clearTimeout(demoTimer);
  }, [user, isPlaying, requireAuth, handlePause, handlePlay]); // Dependencies for the effect
    const menuOptions = useMemo(() => {
    if (!menuState.visible) return [];
    if (menuState.itemType === 'cortina') {
      const index = scheduledCortinas.findIndex(item => item.key === menuState.cortinaKey);
      const lastIndex = scheduledCortinas.length - 1;
      const menuItem = index > -1 ? scheduledCortinas[index] : null;
      const resolvedMeta = normalizeCortinaMeta(menuState.cortinaMeta || menuItem?.meta || null, menuState.cortinaKey || menuItem?.key || null);
      const options = [];
      if (resolvedMeta) {
        options.push({
          label: 'Play Next',
          action: () => {
            insertCortinaMeta(resolvedMeta, 0, menuState.cortinaKey || resolvedMeta.key);
            handleMenuClose();
          },
        });
        options.push({
          label: 'Add to Queue',
          action: () => {
            insertCortinaMeta(resolvedMeta, Number.POSITIVE_INFINITY, menuState.cortinaKey || resolvedMeta.key);
            handleMenuClose();
          },
        });
      }
      if (index > 0) {
        options.push({ label: 'Move to Top', action: () => handleCortinaMenuMove(0) });
        options.push({ label: 'Move Up', action: () => handleCortinaMenuMove(index - 1) });
      }
      if (index > -1 && index < lastIndex) {
        options.push({ label: 'Move Down', action: () => handleCortinaMenuMove(index + 1) });
        options.push({ label: 'Move to Bottom', action: () => handleCortinaMenuMove(lastIndex) });
      }
      if (user && resolvedMeta?.id) {
        const isLiked = localLikedCortinaIds.has(resolvedMeta.id);
        options.push({
          label: isLiked ? 'Remove from Liked' : 'Add to Liked',
          action: () => {
            handleCortinaLikeToggle(resolvedMeta, menuState.cortinaKey || resolvedMeta.key);
            handleMenuClose();
          },
        });
      }
      return options.filter(Boolean);
    }

    return [
      { label: 'Play Next', action: () => handleTandaMenuAction(handlePlayNext) },
      !manualQueueIds.includes(menuState.tandaId) && { label: 'Add to Queue', action: () => handleTandaMenuAction(handleAddToQueue) },
      user && {
        label: localLikedIds.has(menuState.tandaId) ? 'Remove from Liked' : 'Add to Liked',
        action: () => {
          handleLikeToggle(menuState.tandaId);
          handleMenuClose();
        },
      },
    ].filter(Boolean);
  }, [menuState.visible, menuState.itemType, menuState.cortinaKey, menuState.cortinaMeta, menuState.tandaId, scheduledCortinas, handleCortinaMenuMove, handleTandaMenuAction, handlePlayNext, manualQueueIds, handleAddToQueue, user, localLikedIds, handleLikeToggle, handleMenuClose, insertCortinaMeta, normalizeCortinaMeta, localLikedCortinaIds, handleCortinaLikeToggle]);

  if (!hasMounted) {
  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4">
      <div className="p-4 bg-[#30333a] text-white rounded-lg w-full max-w-[32rem] mx-auto text-center">
        Loading Player...
      </div>
    </div>
  );
}
  if (!currentTanda && isLoading && tandaHistory.length === 0 && resetCounter === 0) {
  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4">
      <div className="p-4 bg-[#30333a] text-white rounded-lg w-full max-w-[32rem] mx-auto text-center">
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Image src="/VinylLoader.svg" alt="Loading..." width={96} height={96} priority />
          <p className="text-lg font-semibold">Loading Music...</p>
        </div>
      </div>
    </div>
  );
}
  if (!currentTanda && error) {
  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4">
      <div className="p-4 bg-red-800 text-white rounded-lg w-full max-w-[32rem] mx-auto text-center">
        Error: {error}
        <button
          onClick={() => setResetCounter(c => c + 1)}
          className="ml-2 px-2 py-1 bg-blue-600 rounded text-white text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
  const currentTrackTitle = currentTanda?.tracks_signed?.[currentTrackIndex]?.title || '...';
  const displayTandaLength = currentTanda ? ((currentTanda.type === 'Tango') ? settings.tandaLength : 3) : '?';
  const displayTotalTracks = currentTanda?.tracks_signed?.length || 0;
  const baseButtonClasses = "rounded-full text-gray-300 transition-all duration-200 ease-in-out shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[inset_5px_5px_10px_#131417,inset_-5px_-5px_10px_#4d525d] hover:text-[#25edda]";
  const regularButtonStyle = `${baseButtonClasses} bg-gradient-[145deg] from-[#33373e] to-[#2b2e34]`;
  const primaryButtonStyle = `${baseButtonClasses} bg-gradient-[145deg] from-[#25edda] to-[#23d9c8] text-white`;
  const playPauseButtonStyle = `${baseButtonClasses} bg-gradient-[145deg] from-[#25edda] to-[#23d9c8] text-white`;
  const queueProps = {
    user,
    manualQueue,
    currentTandaId: currentTanda?.id ?? null,
    upcomingPlaylist,
    manualQueueIds,
    upcomingPlaylistIds,
    likedItems,
    handleLikedDragEnd,
    handleDragCancel,
    handleDragStart,
    handleDragEnd,
    handleQueueScroll,
    queueContainerRef,
    sensors,
    onMenuOpen: handleMenuOpen,
    onPlayNow: handlePlayNow,
    isDesktop,
    handleSettingChange: handleSettingChange,
    settings: settings,
    scheduledCortinas,
    currentCortina,
    isCortinaPlaying,
    handleCortinaDragEnd,
    onCortinaMenuOpen: handleCortinaMenuOpen,
    handleRefreshPlaylist,
    isRefreshing,
    isPro
  };
  return (
    <div className="w-full flex flex-col font-sans text-white">
      <main className="flex-1 flex items-center justify-center w-full">
      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex justify-center items-center w-full p-4">
        <div className={`w-full h-[650px] bg-[#30333a]/70 backdrop-blur-xl rounded-2xl p-4 flex justify-center gap-6 shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] transition-all duration-500 ease-in-out ${sidebarsVisible ? 'max-w-[85rem]' : 'max-w-lg'}`}>
          {/* LEFT: EQ & Settings */}
          {sidebarsVisible && (
            <div className="w-[30%] flex flex-col bg-[#30333a] rounded-xl overflow-hidden">
              <div className="flex flex-col mb-2 h-full p-3">
                <div>
                  <h3 className="relative text-lg mb-5 text-center text-gray-300 flex items-center justify-center gap-2">
                    <SparklesIcon className="h-6 w-6" strokeWidth={1}/>
                    <span>Equalizer</span>
                    <button onClick={handleResetEq} title="Reset Equalizer" disabled={user && !isPro} className="absolute top-1/2 right-0 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50">
                      <ArrowUturnLeftIcon className="h-5 w-5" />
                    </button>
                  </h3>
                  <div className={`flex flex-col space-y-4 ${user && !isPro ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col"><label htmlFor="high-eq-desktop" className="text-sm font-medium text-gray-400">HIGH</label><input id="high-eq-desktop" type="range" min="-12" max="12" step="0.1" value={eq.high} onChange={(e) => handleEqChange('high', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent h-2 rounded-lg" /></div>
                    <div className="flex flex-col"><label htmlFor="mid-eq-desktop" className="text-sm font-medium text-gray-400">MID</label><input id="mid-eq-desktop" type="range" min="-12" max="12" step="0.1" value={eq.mid} onChange={(e) => handleEqChange('mid', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent h-2 rounded-lg" /></div>
                    <div className="flex flex-col"><label htmlFor="low-eq-desktop" className="text-sm font-medium text-gray-400">LOW</label><input id="low-eq-desktop" type="range" min="-12" max="12" step="0.1" value={eq.low} onChange={(e) => handleEqChange('low', e.target.value)} className="custom-eq-slider w-full appearance-none cursor-pointer bg-transparent h-2 rounded-lg" /></div>
                  </div>
                </div>
                <div className="mt-auto">
                  <hr className="my-6 border-white/10" />
                  <div>
                    <h3 className="text-lg mb-3 text-center text-gray-300 flex items-center justify-center gap-2">
                      <AdjustmentsVerticalIcon className="h-6 w-6" strokeWidth={1} />
                      <span>Settings</span>
                    </h3>
                    <div className="flex flex-col gap-4">
                      {/* 1. Orchestra Type */}
                      <div>
                        <label htmlFor="categoryFilterDesktop" className="block text-sm font-medium text-gray-400 mb-3">Orchestra Type</label>
                        <div className="relative">
                          <select id="categoryFilterDesktop" name="categoryFilter" value={settings.categoryFilter} onChange={(e) => handleSettingChange('categoryFilter', e.target.value)} className="w-full appearance-none cursor-pointer rounded-full bg-[#30333a] text-white p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]">
                            {ORCHESTRA_TYPE_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                          </select>
                          <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      {/* 3. Tanda Sequence */}
                      <div className="flex flex-col gap-4">
                        <span className="block text-sm font-medium text-gray-400">Tanda Sequence</span>
                        <div className="flex w-full h-10 items-center rounded-full bg-[#30333a] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e] text-xs p-0.5">
                          {segments.map((segment, index) => {
                            const isSelected = selectedSegment === segment.value;
                            return (
                              <button
                                key={segment.value}
                                onClick={() => handleSegmentSelect(segment.value)}
                                className={`flex-1 h-10 py-2 transition-all duration-200 ease-in-out whitespace-nowrap text-center rounded-full ${
                                  isSelected
                                    ? 'bg-[#30333a] text-[#25edda] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d]'
                                    : 'text-gray-400 hover:bg-white/5'
                                }`}
                              >
                                {segment.label}
                              </button>
                            );
                          })}
                        </div>
                        {!isQuickMode && (
                          <div className="relative">
                            <select
                              value={activeFullSequence}
                              onChange={(event) => handleFullSequenceSelect(event.target.value)}
                              className="w-full appearance-none rounded-full mt-2 bg-[#30333a] px-4 py-3 pr-10 text-sm text-white focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-[#25edda] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]"
                            >
                              {fullSequenceOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                          </div>
                        )}
                      </div>
                      {/* 2. Tango Tanda Length */}
                      <div>
                        <span className="block text-sm font-medium text-gray-400 mb-3">
                          Tango Tanda Length
                        </span>
                        <div className={`flex w-full gap-0 mt-1 ${user && !isPro ? 'opacity-50 pointer-events-none' : ''}`}>
                          {TANDA_LENGTH_OPTIONS.map((len, index) => {
                            const isActive = settings.tandaLength === len;
                            return (
                              <button
                                key={len}
                                onClick={() => handleSettingChange('tandaLength', len)}
                                disabled={user && !isPro}
                                className={`flex-1 py-2 text-sm transition-all duration-200 ease-in-out whitespace-nowrap text-center ${
                                  isActive
                                    ? 'text-[#25edda] bg-[#30333a] shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]'
                                    : 'text-gray-400 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e]'
                                } ${index === 0 ? 'rounded-l-full' : index === TANDA_LENGTH_OPTIONS.length - 1 ? 'rounded-r-full' : ''}`}
                              >
                                {len} Tangos
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* CENTER: Player */}
          <div className={`flex flex-col transition-all duration-500 ease-in-out ${sidebarsVisible ? 'w-[40%]' : 'w-full'}`}>
            <div className="relative mt-4 mb-4">
              <button onClick={toggleSidebars} title={sidebarsVisible ? "Focus Mode" : "Show Panels"} className="absolute top-0 right-0 mt-2 p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                {sidebarsVisible ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center gap-8">
              <div className="flex items-center gap-6">
                {currentTanda && currentTanda.artwork_signed ? (
                  <Image
                    src={isCortinaPlaying && currentCortina ? currentCortina.artwork_url_signed ?? '/default-artwork.png' : currentTanda?.artwork_signed || '/default-artwork.png'}
                    alt={`Artwork for ${isCortinaPlaying ? currentCortina.title : currentTanda?.orchestra}`}
                    width={256}
                    height={256}
                    className="object-cover shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] rounded-lg"
                    priority
                  />
                ) : (!currentTanda && !currentCortina) && (
                  <div className="w-64 h-64 bg-[#30333a] rounded-lg shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e] flex items-center justify-center text-gray-500">Artwork</div>
                )}
                {renderVerticalVolumeSlider(volume, handleVolumeChange)}
              </div>
              <div className="text-center min-h-[4em] w-full">
                {isLoading && !currentTanda && <span className="text-sm text-gray-400 block">Loading Music...</span>}
                {error && !isLoading && <span className="text-sm text-red-400 block">Error: {error}</span>}
                {isCortinaPlaying && currentCortina ? (
                  <>
                    <p className="text-xl truncate font-semibold text-gray-100">{currentCortina.title || 'Cortina'}</p>
                    <p className="text-base text-gray-400">{currentCortina.artist || 'Musical Interlude'}</p>
                  </>
                ) : currentTanda ? (
                  (() => {
                const isLiked = localLikedIds.has(currentTanda.id);
                return (
                  <>
                    <div className="ml-9 flex items-center justify-center gap-3">
                      <div className="flex flex-col items-center text-center">
                        <p className="text-xl truncate font-semibold text-gray-100">{currentTanda.orchestra || 'Unknown Orchestra'}</p>
                        <p className="text-base text-gray-400">{currentTanda.singer || 'Instrumental'} - {currentTanda.type || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate select-none">
                          Track {currentTrackIndex + 1} / {Math.min(displayTotalTracks, displayTandaLength)}
                        </p>
                      </div>
                      {user && (
                        <button
                          onClick={() => handleLikeToggle(currentTanda.id)}
                          title={isLiked ? 'Remove from your liked tandas' : 'Add to liked tandas'} 
                          className="flex-shrink-0 ml-1"
                        >
                          {isLiked ? (
                            <HeartIconSolid className="h-6 w-6 text-[#25edda]" />
                          ) : (
                            <HeartIcon className="h-6 w-6 text-gray-400 hover:text-white" />
                          )}
                        </button>
                      )}
                    </div>
                  </>
                );
                  })()
                ) : (
                  !isLoading && !error && <span className="text-lg text-gray-500">No music loaded.</span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 mb-5">
              <audio
                ref={audioRef}
                crossOrigin="anonymous"
                onEnded={isCortinaPlaying ? handleCortinaEnded : handleTrackEnded}
                preload="auto"
                className="hidden"
                onTimeUpdate={handleAudioTimeUpdate}
                onLoadedMetadata={handleAudioLoadedMetadata}
                onPlay={handleAudioPlay}
                onPause={handleAudioPause}
                onError={() => { if (!isResettingRef.current) { setError("An audio playback error occurred."); } }}
              />
              {isCortinaPlaying && currentCortina && !settings.cortinaFullLength && (
                <div className="flex justify-center px-4 mb-3">
                  {currentCortinaFull ? (
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#25edda]">
                      Playing full cortina
                    </span>
                  ) : (
                    <button
                      onClick={handlePlayFullCurrentCortina}
                      className="text-xs font-semibold uppercase tracking-wide text-gray-200 px-3 py-1 rounded-full border border-white/20 hover:bg-white/10 transition-colors duration-200"
                    >
                      Play full cortina
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 mb-4 px-4">
                <span className="text-xs w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
                <div className="relative w-full h-2 cursor-pointer group" onClick={handleProgressClick}>
                  <div className="absolute top-0 left-0 w-full h-full bg-[#222429] rounded-full shadow-[inset_3px_3px_2px_#222429,inset_-3px_-3px_2px_#3e424b]"></div>
                  <div className="absolute top-0 left-0 h-full bg-[#25edda] rounded-l-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                  <div className="absolute top-1/2 w-4 h-4 bg-[#30333a] rounded-full shadow-[2px_2px_1px_#222429,-2px_-2px_1px_#3e424b] pointer-events-none" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}></div>
                  <input type="range" min="0" max={duration || 1} value={currentTime} onMouseDown={handleSeekingStart} onTouchStart={handleSeekingStart} onChange={handleSeek} onMouseUp={handleSeekingEnd} onTouchEnd={handleSeekingEnd} disabled={!currentTanda || duration === 0} className="absolute top-0 left-0 w-full h-full opacity-0 m-0 p-0 cursor-pointer" aria-label="Track progress" />
                </div>
                <span className="text-xs w-10 text-left tabular-nums">{formatTime(duration)}</span>
              </div>
              <div className="flex justify-center items-center space-x-4 mb-1">
                <button onClick={handleRewind} title="Previous Tanda" disabled={tandaHistory.length === 0} className={`${regularButtonStyle} p-3`}><ChevronDoubleLeftIcon className="h-5 w-5" /></button>
                <button onClick={handleSkipBackward} title={isPro ? 'Previous Track' : 'Pro only ? Upgrade'} disabled={!currentTanda || (user && !isPro)} className={`${regularButtonStyle} p-3`}><ChevronLeftIcon className="h-5 w-5" /></button>
                <button onClick={isPlaying ? handlePause : handlePlay} disabled={!currentTanda && isLoading} className={`${playPauseButtonStyle} p-4`} title={isPlaying ? "Pause" : "Play"}>{isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7" />}</button>
                <button onClick={handleSkipForward} title={isPro ? 'Next Track' : 'Pro only ? Upgrade'} disabled={!currentTanda || (user && !isPro)} className={`${regularButtonStyle} p-3`}><ChevronRightIcon className="h-5 w-5" /></button>
                <button onClick={handleNextTandaClick} disabled={isLoading || (manualQueue.length === 0 && upcomingPlaylist.length <= 1)} className={`${primaryButtonStyle} p-3`} title="Next Tanda"><ChevronDoubleRightIcon className="h-5 w-5" /></button>
              </div>
              {skipMsg && (
                <p className="text-xs text-yellow-300 text-center mb-3">{skipMsg}</p>
              )}
            </div>
          </div>
          {/* RIGHT: Queue */}
          {sidebarsVisible && (
            <div className="w-[30%] flex flex-col bg-[#30333a] p-3 rounded-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex-shrink-0 mb-2">
                <div className="grid grid-cols-3">
                  <button
                    onClick={() => setRightPanelTab('queue')}
                    className={`py-2 text-sm font-medium transition-all duration-200 ease-in-out border-r border-white/5 hover:scale-105 flex items-center justify-center gap-2 ${rightPanelTab === 'queue' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
                  >
                    <QueueListIcon className="h-4 w-4" />
                    <span>Queue</span>
                  </button>
                  <button
                    onClick={() => setRightPanelTab('cortinas')}
                    className={`py-2 text-sm font-medium transition-all duration-200 ease-in-out border-r border-white/5 hover:scale-105 flex items-center justify-center gap-2 ${rightPanelTab === 'cortinas' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
                  >
                    <MusicalNoteIcon className="h-4 w-4" />
                    <span>Cortinas</span>
                  </button>
                  <button
                    onClick={() => setRightPanelTab('liked')}
                    className={`py-2 text-sm font-medium transition-all duration-200 ease-in-out hover:scale-105 flex items-center justify-center gap-2 ${rightPanelTab === 'liked' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
                  >
                    <HeartIcon className="h-4 w-4" />
                    <span>Liked</span>
                  </button>
                </div>
              </div>
              {rightPanelTab === 'queue' && (
                <div className="mb-3">
                  <button
                    onClick={handleRefreshPlaylist}
                    title={'Shuffle Playlist'}
                    disabled={isRefreshing}
                    className="w-full py-1 rounded-full border border-[#25edda] text-sm transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center gap-2 text-[#25edda] hover:bg-[#25edda]/10 disabled:opacity-50"
                  >
                    <ArrowsRightLeftIcon className="h-5 w-5" />
                    Shuffle
                  </button>
                </div>
              )}
              {/* Content Area */}
              <div className="relative flex-grow rounded-lg shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b] overflow-hidden">
                <div className="w-full h-full overflow-y-auto">
                  {rightPanelTab === 'queue' && (
                    <QueueContent {...queueProps} isDesktop={isDesktop} />
                  )}
                  {rightPanelTab === 'liked' && (
                    <div className="p-3 px-2 pb-20">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLikedDragEnd} modifiers={[restrictToVerticalAxis]}>
                        <SortableContext items={likedItems.map(item => item.sortableId ?? item.key)} strategy={verticalListSortingStrategy}>
                          {likedItems.length > 0 ? (
                            likedItems.map(item => (
                              item.itemType === 'tanda' ? (
                                <QueueItem
                                  key={item.key}
                                  tanda={item.tanda}
                                  sortableId={item.sortableId}
                                  onMenuOpen={handleMenuOpen}
                                  onPlayNow={handlePlayNow}
                                  isDesktop={isDesktop}
                                />
                              ) : (
                                <LikedCortinaItem
                                  key={item.key}
                                  item={item.cortina}
                                  sortableId={item.sortableId}
                                  onMenuOpen={handleCortinaMenuOpen}
                                />
                              )
                            ))
                          ) : (
                            <p className="p-4 text-center text-gray-500">Your liked items will appear here.</p>
                          )}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                  {rightPanelTab === 'cortinas' && (
                    <div className="p-3 px-2 pb-20">
                      {scheduledCortinas.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleCortinaDragEnd} onDragCancel={handleDragCancel} modifiers={[restrictToVerticalAxis]}>
                          <SortableContext items={scheduledCortinas.map(item => item.sortableId || item.key)} strategy={verticalListSortingStrategy}>
                            {scheduledCortinas.map((item, idx) => {
                              const isActive = isCortinaPlaying && idx === 0 && currentCortina && item.cortinaId && currentCortina.id === item.cortinaId;
                              return (
                                <CortinaRow
                                  key={item.key}
                                  item={item}
                                  sortableId={item.sortableId}
                                  isActive={isActive}
                                  onMenuOpen={handleCortinaMenuOpen}
                                />
                              );
                            })}
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <p className="p-4 text-center text-gray-500">No cortinas scheduled.</p>
                      )}
                    </div>
                  )}
                </div>
                {isRefreshing && (
                  <div className="absolute inset-0 bg-[#30333a80] backdrop-blur-sm flex items-center justify-center transition-opacity duration-300">
                    <p className="text-white font-semibold">Refreshing...</p>
                  </div>
                )}
              </div>
              {/* 3. ADD THE FOOTER COMPONENT HERE */}
              <PanelFooter
                handleRefreshPlaylist={handleRefreshPlaylist}
                isRefreshing={isRefreshing}
                handleSettingChange={handleSettingChange}
                settings={settings}
              />
          </div>
        )}
      </div>
      </div>  
      {/* MOBILE LAYOUT */}
      <div className="block lg:hidden w-full p-2 sm:p-4">
        <div className="p-1 bg-[#30333a] text-white rounded-lg w-full max-w-[32rem] mx-auto">
          <div className="flex justify-center mb-4">
            {currentTanda && currentTanda.artwork_signed ? (
              <Image
                src={isCortinaPlaying && currentCortina ? currentCortina.artwork_url_signed ?? '/default-artwork.png' : currentTanda?.artwork_signed || '/default-artwork.png'}
                alt={`Artwork for ${isCortinaPlaying ? currentCortina.title : currentTanda?.orchestra}`}
                width={256}
                height={256}
                className="object-cover shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] rounded-lg"
                priority
              />
            ) : (!currentTanda && !currentCortina) && (
              <div className="w-64 h-64 bg-[#30333a] rounded-lg shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e] flex items-center justify-center text-gray-500">Artwork</div>
            )}
          </div>
          <div className="mb-4 text-center min-h-[4em]">
            {isCortinaPlaying && currentCortina ? (
              <>
                <p className="text-xl truncate font-semibold text-gray-100">{currentCortina.title || 'Cortina'}</p>
                <p className="text-base text-gray-400">{currentCortina.artist || 'Musical Interlude'}</p>
              </>
            ) : currentTanda ? (
              (() => {
                const isLiked = localLikedIds.has(currentTanda.id);
                return (
                  <>
                    <div className="ml-9 flex items-center justify-center gap-3">
                      <div className="flex flex-col items-center text-center">
                        <p className="text-xl truncate font-semibold text-gray-100">{currentTanda.orchestra || 'Unknown Orchestra'}</p>
                        <p className="text-base text-gray-400">{currentTanda.singer || 'Instrumental'} - {currentTanda.type || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate select-none">
                          Track {currentTrackIndex + 1} / {Math.min(displayTotalTracks, displayTandaLength)}
                        </p>
                      </div>
                      {user && (
                        <button
                          onClick={() => handleLikeToggle(currentTanda.id)}
                          title={isLiked ? 'Remove from your liked tandas' : 'Add to liked tandas'}
                          className="flex-shrink-0 ml-1"
                        >
                          {isLiked ? (
                            <HeartIconSolid className="h-6 w-6 text-[#25edda]" />
                          ) : (
                            <HeartIcon className="h-6 w-6 text-gray-400 hover:text-white" />
                          )}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()
            ) : (
              !isLoading && !error && <span className="text-lg text-gray-500">No music loaded.</span>
            )}
          </div>
          <audio
            ref={audioRef}
            crossOrigin="anonymous"
            onEnded={isCortinaPlaying ? handleCortinaEnded : handleTrackEnded}
            preload="auto"
            className="hidden"
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onPlay={handleAudioPlay}
            onPause={handleAudioPause}
            onError={() => { if (!isResettingRef.current) { setError("An audio playback error occurred."); } }}
          />
          {isCortinaPlaying && currentCortina && !settings.cortinaFullLength && (
            <div className="flex justify-center px-1 mb-3">
              {currentCortinaFull ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-[#25edda]">
                  Playing full cortina
                </span>
              ) : (
                <button
                  onClick={handlePlayFullCurrentCortina}
                  className="text-xs font-semibold uppercase tracking-wide text-gray-200 px-3 py-1 rounded-full border border-white/20 hover:bg-white/10 transition-colors duration-200"
                >
                  Play full cortina
                </button>
              )}
            </div>
          )}
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
            <button
              onClick={handleRewind}
              title="Previous Tanda"
              disabled={tandaHistory.length === 0}
              className="rounded-full text-gray-300 transition-all duration-200 ease-in-out shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] p-3 hover:shadow-[inset_5px_5px_10px_#131417,inset_-5px_-5px_10px_#4d525d] hover:text-[#25edda] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDoubleLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleSkipBackward}
              title={isPro ? 'Skip Track Backward' : 'Pro only ? Upgrade'}
              disabled={!currentTanda || !isPro}
              className="rounded-full text-gray-300 transition-all duration-200 ease-in-out shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] p-3 hover:shadow-[inset_5px_5px_10px_#131417,inset_-5px_-5px_10px_#4d525d] hover:text-[#25edda] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={!currentTanda && isLoading}
              className="rounded-full text-white transition-all duration-200 ease-in-out shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] p-4 bg-gradient-[145deg] from-[#25edda] to-[#23d9c8]"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7" />}
            </button>
            <button
              onClick={handleSkipForward}
              title={isPro ? 'Skip Track Forward' : 'Pro only ? Upgrade'}
              disabled={!currentTanda || !isPro}
              className="rounded-full text-gray-300 transition-all duration-200 ease-in-out shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] p-3 hover:shadow-[inset_5px_5px_10px_#131417,inset_-5px_-5px_10px_#4d525d] hover:text-[#25edda] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleNextTandaClick}
              disabled={isLoading || upcomingPlaylist.length <= 1}
              className="rounded-full text-white transition-all duration-200 ease-in-out shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] p-3 bg-gradient-[145deg] from-[#25edda] to-[#23d9c8]"
              title="Next Tanda"
            >
              <ChevronDoubleRightIcon className="h-5 w-5" />
            </button>
          </div>
          {skipMsg && (
            <p className="text-xs text-yellow-300 text-center mb-2">{skipMsg}</p>
          )}
          <div className="flex justify-center items-center space-x-4 mt-4 border-t border-gray-700/50 pt-2">
            <button
              onClick={() => handlePanelToggle('settings')}
              title="Settings"
              className={`p-2 rounded-full transition-colors ${activePanel === 'settings' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
            >
              <AdjustmentsVerticalIcon className="h-6 w-6" />
            </button>
            <button
              onClick={() => handlePanelToggle('eq')}
              title="Equalizer"
              className={`p-2 rounded-full transition-colors ${activePanel === 'eq' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
            >
              <SparklesIcon className="h-6 w-6" />
            </button>
            <button
              onClick={() => handlePanelToggle('queue')}
              title="Queue"
              className={`p-2 rounded-full transition-colors ${activePanel === 'queue' ? 'text-[#25edda]' : 'text-gray-400 hover:text-white'}`}
            >
              <QueueListIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
      </main>
      {/* Context menu + mobile panels */}
      {menuState.visible && (
        <ContextMenu
          position={{
            x: menuState.x,
            y: menuState.y,
            anchorRect: menuState.anchorRect,
            placement: menuState.placement,
            verticalAlign: menuState.verticalAlign,
            horizontalAlign: menuState.horizontalAlign,
            offset: menuState.offset,
            offsetY: menuState.offsetY,
          }}
          onClose={handleMenuClose}
          options={menuOptions}
        />
      )}
      {hasMounted && !isDesktop && (
        <Queue
          isOpen={activePanel === 'queue'}
          onClose={() => handlePanelToggle('queue')}
          rightPanelTab={rightPanelTab}
          handleDragStart={handleDragStart}
          setRightPanelTab={setRightPanelTab}
          {...queueProps}
        />
      )}
      {hasMounted && !isDesktop && (
        <EqPanel
          isOpen={activePanel === 'eq'}
          onClose={() => handlePanelToggle('eq')}
          eq={eq}
          handleEqChange={handleEqChange}
          handleResetEq={handleResetEq}
          eqNotification={eqNotification}
          user={user}
          isPro={isPro}
        />
      )}
      {hasMounted && !isDesktop && (
        <SettingsPanel
          isOpen={activePanel === 'settings'}
          onClose={() => handlePanelToggle('settings')}
          settings={settings}
          handleSettingChange={handleSettingChange}
          user={user}
          isPro={isPro}
          lastFullSequence={lastFullSequence}
          activeFullSequence={activeFullSequence}
          onFullSequenceSelect={handleFullSequenceSelect}
        />
      )}
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (() => {
          switch (activeDragItem.type) {
            case 'tanda':
              return <div className="opacity-75 shadow-2xl"><QueueItem tanda={activeDragItem.data} isDesktop={isDesktop} isDragOverlay /></div>;
            case 'cortina': // This is for LikedCortinaItem
              return <div className="opacity-75 shadow-2xl"><LikedCortinaItem item={activeDragItem.data} isDragOverlay /></div>;
            case 'cortinaRow': // This is for CortinaRow in the cortinas tab
              return <div className="opacity-75 shadow-2xl"><CortinaRow item={activeDragItem.data} isDragOverlay /></div>;
            default:
              return null;
          }
        })() : null}
      </DragOverlay>
    </div>
  );
}
