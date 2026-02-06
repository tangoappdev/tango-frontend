'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { slugify } from './utils';
import { useAuth } from '@/components/AuthProvider';
import MilongaQuickEditModal from './MilongaQuickEditModal';

const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined) return null;
  const hrs24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const meridiem = hrs24 >= 12 ? 'pm' : 'am';
  const hrs12 = hrs24 % 12 || 12;
  return `${hrs12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${meridiem}`;
};

const formatTimeRange = (event) => {
  if (event.startTimeMinutes === null && event.endTimeMinutes === null) {
    return event.timeRangeRaw || null;
  }
  const start = formatMinutes(event.startTimeMinutes);
  const end = formatMinutes(event.endTimeMinutes);
  if (start && end) return `${start} - ${end}`;
  return start || end || event.timeRangeRaw || null;
};

const formatEventType = (value) => {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const buildDirectionsUrl = (event) => {
  if (event.latitude && event.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
  }
  if (event.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      event.address
    )}`;
  }
  return null;
};

const RecurringEvents = ({ events }) => {
  const { isAdmin } = useAuth();
  const [localEvents, setLocalEvents] = useState(events || []);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    setLocalEvents(events || []);
  }, [events]);

  if (!localEvents?.length) return null;

  return (
    <section className="mt-12 rounded-3xl border border-white/10 bg-[#2a2d33] p-6">
      <h2 className="text-lg font-semibold text-white">Recurring year-round events</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {localEvents.map((event) => (
          <article
            key={event.id}
            className="relative cursor-pointer rounded-2xl border border-white/5 bg-[#30333a] transition hover:border-white/20"
            onClick={(eventClick) => {
              if (eventClick.target.closest('a')) return;
              window.location.href = `/milonga-guide/event/${event.id}/${slugify(event.title)}`;
            }}
          >
            {isAdmin && (
              <button
                type="button"
                onClick={(eventClick) => {
                  eventClick.stopPropagation();
                  setEditingEvent(event);
                }}
                className="absolute right-3 top-3 rounded-full border border-white/10 bg-[#2a2d33] p-1.5 text-gray-200 hover:border-white/30"
                title="Edit"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
            )}
            <div className="flex flex-row items-start gap-4 p-5">
              {(event.imageUrl ||
                event.citySlug === 'new-york' ||
                event.citySlug === 'san-francisco' ||
                event.citySlug === 'paris') && (
                <div className="h-[114px] w-[114px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {event.imageUrl ? (
                    <Image
                      src={event.imageUrl}
                      alt={`${event.title} logo`}
                      width={114}
                      height={114}
                      className="h-full w-full object-cover"
                      sizes="114px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2d33] via-[#30333a] to-[#1f2126] px-2 text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.18em] text-[#25edda]/80">
                      {event.title}
                    </div>
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {formatTimeRange(event) && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-gray-200">
                      {formatTimeRange(event)}
                    </span>
                  )}
                  {event.eventType && (
                    <span className="rounded-full border border-[#25edda]/30 px-3 py-1 text-[#25edda]">
                      {formatEventType(event.eventType)}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">
                  <MarqueeText className="text-base font-semibold text-white" text={event.title} />
                </h3>
                {event.venue && (
                  <p className="mt-2 text-sm font-medium text-gray-200">{event.venue}</p>
                )}
                {event.address && (
                  <p className="mt-1 text-sm text-gray-300">{event.address}</p>
                )}
                {buildDirectionsUrl(event) && (
                  <a
                    href={buildDirectionsUrl(event)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                    onClick={(eventClick) => eventClick.stopPropagation()}
                  >
                    Get directions
                  </a>
                )}
                {event.frequencyRaw && (
                  <p className="mt-2 text-xs text-gray-400">{event.frequencyRaw}</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      <MilongaQuickEditModal
        open={Boolean(editingEvent)}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSaved={(updated) => {
          setLocalEvents((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          );
        }}
        onDeleted={(deleted) => {
          setLocalEvents((prev) => prev.filter((item) => item.id !== deleted.id));
        }}
      />
    </section>
  );
};

function MarqueeText({ text, className }) {
  const containerRef = useRef(null);
  const [isOverflow, setIsOverflow] = useState(false);
  const [marqueeStyle, setMarqueeStyle] = useState({});

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const distance = node.scrollWidth - node.clientWidth;
    if (distance > 0) {
      const duration = Math.max(4, distance / 35);
      setIsOverflow(true);
      setMarqueeStyle({
        '--marquee-distance': `${distance}px`,
        '--marquee-duration': `${duration}s`,
      });
    } else {
      setIsOverflow(false);
      setMarqueeStyle({});
    }
  }, [text]);

  return (
    <div ref={containerRef} className={`marquee-container ${className}`}>
      <span
        className={`marquee-content ${isOverflow ? 'marquee-animate' : ''}`}
        style={marqueeStyle}
      >
        {text}
      </span>
      <style jsx>{`
        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
          position: relative;
        }
        .marquee-content {
          display: inline-block;
          will-change: transform;
        }
        .marquee-animate {
          animation: marquee var(--marquee-duration) linear infinite;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-1 * var(--marquee-distance)));
          }
        }
      `}</style>
    </div>
  );
}

export default RecurringEvents;
