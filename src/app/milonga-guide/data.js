import { getFirestore } from '@/lib/firebaseAdmin.server';

const DAYS_AHEAD = 28;
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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

export async function getEventsByCity(citySlug) {
  const db = getFirestore();
  const timeZone = CITY_TIMEZONES[citySlug] || 'UTC';
  const now = new Date();
  const todayKey = getDateKeyInTimeZone(now, timeZone);
  const base = todayKey ? new Date(`${todayKey}T12:00:00Z`) : now;
  const end = new Date(base);
  end.setUTCDate(base.getUTCDate() + DAYS_AHEAD);

  const startIso = todayKey || now.toISOString().slice(0, 10);
  const endIso = getDateKeyInTimeZone(end, timeZone) || end.toISOString().slice(0, 10);

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

  const normalizeKey = (value) =>
    (value || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-');

  const buildEventKey = (event) =>
    [normalizeKey(event.title), normalizeKey(event.venue), normalizeKey(event.address)]
      .filter(Boolean)
      .join('|');

  const buildStableKey = (event) => {
    if (event?.stableKey) return event.stableKey;
    if (event?.sourceEventId) return `${event.source}:${event.sourceEventId}`;
    const eventKey = event?.eventKey || buildEventKey(event);
    return `${event.source}:key:${eventKey}`;
  };

  const allEvents = [...datedEvents, ...recurringEvents];
  const stableKeys = Array.from(
    new Set(allEvents.map((event) => buildStableKey(event)).filter(Boolean))
  );
  const overridesMap = new Map();
  if (stableKeys.length) {
    const overridesCollection = db.collection('external_event_overrides');
    const refs = stableKeys.map((key) => overridesCollection.doc(key));
    const overrideDocs = await db.getAll(...refs);
    overrideDocs.forEach((doc) => {
      if (doc.exists) {
        overridesMap.set(doc.id, doc.data());
      }
    });
  }

  const applyOverrides = (event) => {
    const stableKey = buildStableKey(event);
    const override = stableKey ? overridesMap.get(stableKey) : null;
    if (override?.date) {
      const { date, ...rest } = override;
      return {
        ...event,
        stableKey,
        ...rest,
      };
    }
    return {
      ...event,
      stableKey,
      ...(override || {}),
    };
  };

  const mergedDated = datedEvents.map(applyOverrides);
  const mergedRecurring = recurringEvents.map(applyOverrides);

  mergedDated.sort((a, b) => {
    if (a.date === b.date) {
      const aStart = a.startTimeMinutes ?? parseTimeRange(a.descriptionRaw).startMinutes ?? 9999;
      const bStart = b.startTimeMinutes ?? parseTimeRange(b.descriptionRaw).startMinutes ?? 9999;
      return aStart - bStart;
    }
    return a.date.localeCompare(b.date);
  });

  const grouped = new Map();
  mergedDated.forEach((event) => {
    if (!grouped.has(event.date)) grouped.set(event.date, []);
    grouped.get(event.date).push(event);
  });

  mergedRecurring.sort((a, b) => {
    const aIndex = DAY_ORDER.indexOf(a.dayOfWeek || '');
    const bIndex = DAY_ORDER.indexOf(b.dayOfWeek || '');
    if (aIndex !== bIndex) return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    return (a.title || '').localeCompare(b.title || '');
  });

  return {
    groupedEvents: Array.from(grouped.entries()),
    recurringEvents: mergedRecurring,
  };
}

