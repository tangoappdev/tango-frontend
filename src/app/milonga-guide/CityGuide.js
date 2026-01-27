import { getFirestore } from '@/lib/firebaseAdmin.server';
import DayTabs from './DayTabs';

const DAYS_AHEAD = 45;
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parseTimeRange(text) {
  if (!text) return { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  const normalized = text.replace(/\s+/g, ' ');
  const rangeMatch = normalized.match(
    /(\d{1,2}(?::\d{2})?\s*(?:a|p|am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:a|p|am|pm)?)/i
  );
  if (!rangeMatch) return { startMinutes: null, endMinutes: null, timeRangeRaw: null };

  const normalizeToken = (token) => token.toLowerCase().replace(/\s+/g, '');
  const parseToken = (token) => {
    const match = normalizeToken(token).match(/(\d{1,2})(?::|\.|h)?(\d{2})?(a|p|am|pm)?/);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = match[2] ? Number(match[2]) : 0;
    const mer = match[3] || '';
    const meridiem = mer.startsWith('p') ? 'pm' : mer.startsWith('a') ? 'am' : null;
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return { hours, minutes, meridiem };
  };

  const startToken = rangeMatch[1];
  const endToken = rangeMatch[2];
  const start = parseToken(startToken);
  const end = parseToken(endToken);
  let startMinutes = start ? start.hours * 60 + start.minutes : null;
  let endMinutes = end ? end.hours * 60 + end.minutes : null;

  if (start && end && !end.meridiem && start.meridiem) {
    const adjusted = parseToken(`${endToken}${start.meridiem}`);
    if (adjusted) {
      endMinutes = adjusted.hours * 60 + adjusted.minutes;
    }
  }

  return { startMinutes, endMinutes, timeRangeRaw: rangeMatch[0].trim() };
}

function formatTimeRange(event) {
  if (event.startTimeMinutes === null && event.endTimeMinutes === null) {
    return event.timeRangeRaw || null;
  }
  const formatMinutes = (minutes) => {
    if (minutes === null || minutes === undefined) return null;
    const hrs24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const meridiem = hrs24 >= 12 ? 'pm' : 'am';
    const hrs12 = hrs24 % 12 || 12;
    return `${hrs12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${meridiem}`;
  };
  const start = formatMinutes(event.startTimeMinutes);
  const end = formatMinutes(event.endTimeMinutes);
  if (start && end) return `${start} - ${end}`;
  return start || end || event.timeRangeRaw || null;
}

async function getEventsByCity(citySlug) {
  const db = getFirestore();
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + DAYS_AHEAD);

  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  const [datedSnapshot, recurringSnapshot] = await Promise.all([
    db
      .collection('external_events')
      .where('citySlug', '==', citySlug)
      .where('date', '>=', startIso)
      .where('date', '<=', endIso)
      .get(),
    db
      .collection('external_events')
      .where('citySlug', '==', citySlug)
      .where('recurring', '==', true)
      .get(),
  ]);

  const datedEvents = datedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const recurringEvents = recurringSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  datedEvents.sort((a, b) => {
    if (a.date === b.date) {
      const aStart = a.startTimeMinutes ?? parseTimeRange(a.descriptionRaw).startMinutes ?? 9999;
      const bStart = b.startTimeMinutes ?? parseTimeRange(b.descriptionRaw).startMinutes ?? 9999;
      return aStart - bStart;
    }
    return a.date.localeCompare(b.date);
  });

  const grouped = new Map();
  datedEvents.forEach((event) => {
    if (!grouped.has(event.date)) grouped.set(event.date, []);
    grouped.get(event.date).push(event);
  });

  recurringEvents.sort((a, b) => {
    const aIndex = DAY_ORDER.indexOf(a.dayOfWeek || '');
    const bIndex = DAY_ORDER.indexOf(b.dayOfWeek || '');
    if (aIndex !== bIndex) return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    return (a.title || '').localeCompare(b.title || '');
  });

  return {
    groupedEvents: Array.from(grouped.entries()),
    recurringEvents,
  };
}

export default async function CityGuide({ citySlug }) {
  const { groupedEvents, recurringEvents } = await getEventsByCity(citySlug);

  return (
    <>
      {groupedEvents.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          No upcoming events found yet. Please check back soon.
        </div>
      ) : (
        <DayTabs groupedEvents={groupedEvents} />
      )}

      {recurringEvents.length > 0 && (
        <section className="mt-12 rounded-3xl border border-white/10 bg-[#2a2d33] p-6">
          <h2 className="text-lg font-semibold text-white">Recurring year-round events</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {recurringEvents.map((event) => (
              <article key={event.id} className="rounded-2xl border border-white/5 bg-[#30333a]">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
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
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2d33] via-[#30333a] to-[#1f2126] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#25edda]/80">
                          NY
                        </div>
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      {event.dayOfWeek && (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-gray-300">
                          {event.dayOfWeek}
                        </span>
                      )}
                      {formatTimeRange(event) && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-gray-200">
                          {formatTimeRange(event)}
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
                    {event.frequencyRaw && (
                      <p className="mt-2 text-xs text-gray-400">{event.frequencyRaw}</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
