'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { slugify } from './utils';
import MapView from './MapView';
import { useAuth } from '@/components/AuthProvider';
import MilongaQuickEditModal from './MilongaQuickEditModal';

const CITY_TIMEZONES = {
  'new-york': 'America/New_York',
  'buenos-aires': 'America/Argentina/Buenos_Aires',
  'san-francisco': 'America/Los_Angeles',
  berlin: 'Europe/Berlin',
  'sao-paulo': 'America/Sao_Paulo',
  athens: 'Europe/Athens',
  turkiye: 'Europe/Istanbul',
  england: 'Europe/London',
  miami: 'America/New_York',
  paris: 'Europe/Paris',
  rome: 'Europe/Rome',
  austin: 'America/Chicago',
  barcelona: 'Europe/Madrid',
};

function buildDateKeyFromParts(parts) {
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function getDateKeyInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  return buildDateKeyFromParts(parts);
}

function formatTabLabel(date, timeZone) {
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(date),
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone }).format(date),
  };
}

function formatDateHeading(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(date);
}

function buildDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return null;
  const hrs24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const meridiem = hrs24 >= 12 ? 'pm' : 'am';
  const hrs12 = hrs24 % 12 || 12;
  return `${hrs12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${meridiem}`;
}

function formatTimeRange(event) {
  if (event.startTimeMinutes === null && event.endTimeMinutes === null) {
    return event.timeRangeRaw || null;
  }
  const start = formatMinutes(event.startTimeMinutes);
  const end = formatMinutes(event.endTimeMinutes);
  if (start && end) return `${start} - ${end}`;
  return start || end || event.timeRangeRaw || null;
}

function formatEventType(value) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildDirectionsUrl(event) {
  if (!event) return null;
  if (event.latitude && event.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
  }
  if (event.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      event.address
    )}`;
  }
  return null;
}

export default function DayTabs({ groupedEvents, citySlug }) {
  const { isAdmin } = useAuth();
  const timeZone = CITY_TIMEZONES[citySlug] || 'UTC';
  const [weekOffset, setWeekOffset] = useState(0);
  const [localGroupedEvents, setLocalGroupedEvents] = useState(groupedEvents);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    setLocalGroupedEvents(groupedEvents);
  }, [groupedEvents]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    localGroupedEvents.forEach(([date, events]) => {
      map.set(date, events);
    });
    return map;
  }, [localGroupedEvents]);

  const days = useMemo(() => {
    const list = [];
    const todayKey = getDateKeyInTimeZone(new Date(), timeZone);
    const base = todayKey ? new Date(`${todayKey}T12:00:00Z`) : new Date();
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() + weekOffset * 7);
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = getDateKeyInTimeZone(d, timeZone);
      list.push({
        key,
        label: formatTabLabel(d, timeZone),
        heading: formatDateHeading(d, timeZone),
        events: eventsByDate.get(key) || [],
      });
    }
    return list;
  }, [eventsByDate, weekOffset, timeZone]);

  const [activeKey, setActiveKey] = useState(days[0]?.key);

  useEffect(() => {
    setActiveKey(days[0]?.key);
  }, [days]);
  const activeDay = days.find((day) => day.key === activeKey) || days[0];
  const listRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = listRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
  };

  const scrollByAmount = (direction) => {
    const el = listRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <div>
      <div
        className="flex items-center justify-between gap-2"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          event.currentTarget.dataset.touchX = `${touch.clientX}`;
        }}
        onTouchEnd={(event) => {
          const startX = Number(event.currentTarget.dataset.touchX || 0);
          const endX = event.changedTouches[0]?.clientX ?? startX;
          const delta = endX - startX;
          if (Math.abs(delta) < 40) return;
          if (delta < 0) {
            setWeekOffset((prev) => Math.min(3, prev + 1));
          } else {
            setWeekOffset((prev) => Math.max(0, prev - 1));
          }
        }}
      >
        <button
          type="button"
          onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
          disabled={weekOffset === 0}
          className={`hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 text-lg text-gray-200 transition sm:inline-flex ${
            weekOffset === 0
              ? 'cursor-not-allowed opacity-40'
              : 'hover:border-white/30 hover:bg-white/5'
          }`}
          aria-label="Previous week"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-2">
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => setActiveKey(day.key)}
              className={`rounded-2xl px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeKey === day.key
                  ? 'bg-[#25edda] text-[#1f2126]'
                  : 'border border-white/15 text-gray-200 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide">
                <span className="sm:hidden">{day.label.weekday.slice(0, 1)}</span>
                <span className="hidden sm:inline">{day.label.weekday}</span>
              </span>
              <span className="mt-1 block text-lg font-semibold leading-none">{day.label.day}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((prev) => Math.min(3, prev + 1))}
          disabled={weekOffset === 3}
          className={`hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 text-lg text-gray-200 transition sm:inline-flex ${
            weekOffset === 3
              ? 'cursor-not-allowed opacity-40'
              : 'hover:border-white/30 hover:bg-white/5'
          }`}
          aria-label="Next week"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 sm:hidden">
        {[0, 1, 2, 3].map((index) => (
          <button
            key={index}
            type="button"
            onClick={() => setWeekOffset(index)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              weekOffset === index ? 'bg-[#25edda]' : 'bg-white/20'
            }`}
            aria-label={`Week ${index + 1}`}
          />
        ))}
      </div>

      <div className="mt-4">
        <MapView events={activeDay?.events || []} />
        <h2 className="mt-4 text-lg font-semibold text-white">{activeDay?.heading}</h2>
        {activeDay?.events?.length ? (
          <>
            <div className="relative mt-4">
              <div className="pointer-events-none absolute left-0 top-1/2 z-10 flex w-full -translate-y-1/2 items-center justify-between px-3">
                <button
                  type="button"
                  onClick={() => scrollByAmount(-1)}
                  disabled={!canScrollLeft}
                  className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#2a2d33] text-gray-300 transition hover:border-white/30 disabled:opacity-40"
                  aria-label="Scroll left"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByAmount(1)}
                  disabled={!canScrollRight}
                  className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#2a2d33] text-gray-300 transition hover:border-white/30 disabled:opacity-40"
                  aria-label="Scroll right"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
              <div
                ref={listRef}
                onScroll={updateScrollState}
                onMouseEnter={updateScrollState}
                className="milonga-scroll -mx-2 flex gap-4 overflow-x-auto px-2 pb-2 sm:mx-0 sm:px-0 sm:pb-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
            {activeDay.events.map((event) => (
              <article
                key={event.id}
                className="relative w-[394px] flex-shrink-0 cursor-pointer rounded-2xl border border-white/10 bg-[#30333a] transition hover:border-white/20 sm:overflow-hidden sm:border-white/5"
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
                <div className="flex flex-row items-start gap-4 px-3 py-3 sm:p-5">
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
                      <Link
                        href={`/milonga-guide/event/${event.id}/${slugify(event.title)}`}
                        className="group block"
                      >
                        <MarqueeText
                          className="text-base font-semibold text-white group-hover:text-[#25edda]"
                          text={event.title}
                        />
                      </Link>
                    </h3>
                    {event.venue && <MarqueeText className="mt-2 text-sm font-medium text-gray-200" text={event.venue} />}
                    {event.address && <MarqueeText className="mt-1 text-sm text-gray-300" text={event.address} />}
                    {buildDirectionsUrl(event) && (
                      <a
                        href={buildDirectionsUrl(event)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                      >
                        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4" fill="currentColor">
                          <path d="M43.41 22.59l-18-18c-.78-.78-2.05-.78-2.82 0l-18 18c-.78.78-.78 2.05 0 2.83l18 17.99v.01c.78.78 2.05.78 2.83 0l18-18c.78-.79.78-2.05-.01-2.83zM28 29v-5h-8v6h-4v-8c0-1.11.89-2 2-2h10v-5l7 7-7 7z" />
                        </svg>
                        Get directions
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
              </div>
            </div>
            <style jsx>{`
              .milonga-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#30333a] p-6 text-sm text-gray-300">
            No events listed for this day.
          </div>
        )}
      </div>
      <MilongaQuickEditModal
        open={Boolean(editingEvent)}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSaved={(updated) => {
          setLocalGroupedEvents((prev) =>
            prev.map(([date, items]) => [
              date,
              items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
            ])
          );
        }}
        onDeleted={(deleted) => {
          setLocalGroupedEvents((prev) =>
            prev
              .map(([date, items]) => [date, items.filter((item) => item.id !== deleted.id)])
              .filter(([, items]) => items.length > 0)
          );
        }}
      />
    </div>
  );
}

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
