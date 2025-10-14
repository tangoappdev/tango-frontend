'use client';

import { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export const TandaRow = ({ tanda, onEdit, onDelete, isGloballyExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(isGloballyExpanded);
  }, [isGloballyExpanded]);

  return (
    <div className="bg-transparent border-b border-white/5 last:border-b-0">
      {/* Main Tanda Info Row */}
      <div className="flex items-center p-4 cursor-pointer hover:bg-white/5" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex-1 grid grid-cols-13 gap-4 items-center divide-x divide-gray-700/50">
          <div className="col-span-1 flex items-center pr-4">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded-full hover:bg-white/10">
              {isExpanded ? <ChevronDownIcon className="h-5 w-5 text-gray-400" /> : <ChevronRightIcon className="h-5 w-5 text-gray-400" />}
            </button>
          </div>
          <p className="col-span-4 text-white truncate pl-4">{tanda.orchestra}</p>
          <p className="col-span-3 text-gray-400 truncate pl-4">{tanda.singer || 'Instrumental'}</p>
          <p className="col-span-2 text-gray-400 truncate pl-4">{tanda.type}</p>
          <p className="col-span-2 text-gray-400 truncate pl-4">{tanda.style || 'N/A'}</p>
          <p className="col-span-1 text-gray-300 truncate pl-4 text-right">{tanda.likesCount ?? 0}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 ml-4">
          <button onClick={(e) => { e.stopPropagation(); onEdit(tanda.id); }} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <PencilIcon className="h-5 w-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(tanda); }} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-white/10 transition-colors">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Expanded Track Details View */}
      {isExpanded && (
        <div className="pb-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-1"></div> {/* Spacer column */}
            <div className="col-span-11 border-t border-white/10 pt-3">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Tracks:</h4>
              {tanda.tracks && tanda.tracks.length > 0 ? (
                <ul className="space-y-1">
                  {tanda.tracks.map((track, index) => (<li key={index} className="text-gray-300 text-sm truncate">{index + 1}. {track.title}</li>))}
                </ul>
              ) : (<p className="text-gray-500 text-sm">No tracks found for this tanda.</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};