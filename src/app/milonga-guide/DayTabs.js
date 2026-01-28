'use client';

import { useMemo, useState } from 'react';

function formatTabLabel(date) {
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date),
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
  };
}

function formatDateHeading(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
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

export default function DayTabs({ groupedEvents }) {
  const eventsByDate = useMemo(() => {
    const map = new Map();
    groupedEvents.forEach(([date, events]) => {
      map.set(date, events);
    });
    return map;
  }, [groupedEvents]);

  const days = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = buildDateKey(d);
      list.push({
        key,
        label: formatTabLabel(d),
        heading: formatDateHeading(d),
        events: eventsByDate.get(key) || [],
      });
    }
    return list;
  }, [eventsByDate]);

  const [activeKey, setActiveKey] = useState(days[0]?.key);
  const activeDay = days.find((day) => day.key === activeKey) || days[0];

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
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

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-white">{activeDay?.heading}</h2>
        {activeDay?.events?.length ? (
          <div className="mt-4 flex flex-col gap-4">
            {activeDay.events.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-2xl border border-white/5 bg-[#30333a]"
              >
                <div className="flex flex-row items-start gap-4 p-5">
                  {(event.imageUrl || event.citySlug === 'new-york') && (
                    <div className="h-[114px] w-[114px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={`${event.title} logo`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2d33] via-[#30333a] to-[#1f2126] text-xs font-semibold uppercase tracking-[0.2em] text-[#25edda]/80">
                          NY
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
                      {event.dayOfWeek && (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-gray-300">
                          {event.dayOfWeek}
                        </span>
                      )}
                  {event.eventType && (
                    <span className="rounded-full border border-[#25edda]/30 px-3 py-1 text-[#25edda]">
                      {formatEventType(event.eventType)}
                    </span>
                  )}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-white">{event.title}</h3>
                    {event.venue && (
                      <p className="mt-2 text-sm font-medium text-gray-200">{event.venue}</p>
                    )}
                    {event.address && (
                      <p className="mt-1 text-sm text-gray-300">{event.address}</p>
                    )}
                    {event.sourceUrl && event.citySlug !== 'buenos-aires' && (
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                      >
                        View source
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#30333a] p-6 text-sm text-gray-300">
            No events listed for this day.
          </div>
        )}
      </div>
    </div>
  );
}
