import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_ID = 'milongueandoroma';
const CALENDAR_ID = 'milongueandoroma@gmail.com';
const SOURCE_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(
  CALENDAR_ID
)}/public/basic.ics`;
const CITY_NAME = 'Rome';
const CITY_SLUG = 'rome';
const CITY_TIMEZONE = 'Europe/Rome';

function normalizeWhitespace(value) {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
}

function decodeIcsText(value) {
  if (!value) return '';
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseIcsDateTime(raw) {
  if (!raw) return { date: null, minutes: null };
  const value = raw.replace(/Z$/, '');
  const datePart = value.slice(0, 8);
  if (datePart.length !== 8) return { date: null, minutes: null };
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6));
  const day = Number(datePart.slice(6, 8));
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return { date: null, minutes: null };
  }
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (value.length <= 8) return { date, minutes: null };
  const timePart = value.slice(9, 15);
  if (timePart.length < 4) return { date, minutes: null };
  const hours = Number(timePart.slice(0, 2));
  const minutes = Number(timePart.slice(2, 4));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return { date, minutes: null };
  return { date, minutes: hours * 60 + minutes };
}

function getDayOfWeek(dateStr) {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: CITY_TIMEZONE,
  }).format(date);
}

function detectEventType(text) {
  if (!text) return 'milonga';
  if (/pratica/i.test(text)) return 'practica';
  if (/milonga/i.test(text)) return 'milonga';
  return 'milonga';
}

function normalizeKey(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

function buildEventKey({ title, venue, address }) {
  return [normalizeKey(title), normalizeKey(venue), normalizeKey(address)]
    .filter(Boolean)
    .join('|');
}

function buildEventId(payload) {
  const hash = crypto
    .createHash('sha1')
    .update(`${payload.source}|${payload.date}|${payload.title}|${payload.startTimeMinutes || ''}`)
    .digest('hex');
  return `${payload.source}-${hash.slice(0, 20)}`;
}

function parseIcsEvents(icsText) {
  const lines = icsText
    .split(/\r?\n/)
    .reduce((acc, line) => {
      if (line.startsWith(' ') && acc.length) {
        acc[acc.length - 1] += line.slice(1);
      } else {
        acc.push(line);
      }
      return acc;
    }, []);

  const events = [];
  let current = null;

  lines.forEach((line) => {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      return;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      return;
    }
    if (!current) return;

    const [rawKey, ...rest] = line.split(':');
    const value = rest.join(':');
    if (!rawKey) return;
    const key = rawKey.split(';')[0];
    current[key] = value;
  });

  return events;
}

async function deleteExistingSourceEvents(db) {
  const collection = db.collection('external_events');
  let totalDeleted = 0;
  while (true) {
    const snapshot = await collection.where('source', '==', SOURCE_ID).limit(400).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
  }
  return totalDeleted;
}

export async function POST(request) {
  const token = request.headers.get('x-sync-token');
  if (!token || token !== process.env.SOURCE_SYNC_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const db = getFirestore();

  try {
    const res = await fetch(SOURCE_URL, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'VirtualTangoDJBot/1.0 (+https://virtualtangodj.com)',
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch source: ${res.status}`);
    }

    const icsText = await res.text();
    const rawEvents = parseIcsEvents(icsText);

    const events = rawEvents
      .map((evt) => {
        const summary = normalizeWhitespace(decodeIcsText(evt.SUMMARY || ''));
        const description = decodeIcsText(evt.DESCRIPTION || '');
        const location = normalizeWhitespace(decodeIcsText(evt.LOCATION || ''));
        const url = evt.URL ? decodeIcsText(evt.URL) : null;
        const sourceEventId = decodeIcsText(evt.UID || '') || null;

        const start = parseIcsDateTime(evt.DTSTART || evt['DTSTART;VALUE=DATE']);
        const end = parseIcsDateTime(evt.DTEND || evt['DTEND;VALUE=DATE']);

        const date = start.date || end.date;
        if (!date || !summary) return null;

        const eventType = detectEventType(`${summary} ${description}`);
        const eventKey = buildEventKey({ title: summary, venue: null, address: location });

        return {
          source: SOURCE_ID,
          sourceUrl: url || SOURCE_URL,
          city: CITY_NAME,
          citySlug: CITY_SLUG,
          date,
          title: summary,
          venue: null,
          address: location || null,
          descriptionRaw: normalizeWhitespace(description) || null,
          sourceEventId: sourceEventId || null,
          eventKey,
          tagsRaw: [],
          links: [],
          scrapedAt: new Date().toISOString(),
          status: 'active',
          timeRangeRaw: null,
          startTimeMinutes: start.minutes,
          endTimeMinutes: end.minutes,
          eventType,
          recurring: false,
          frequencyRaw: null,
          dayOfWeek: getDayOfWeek(date),
          stableKey: sourceEventId
            ? `${SOURCE_ID}:${sourceEventId}`
            : `${SOURCE_ID}:key:${eventKey}`,
        };
      })
      .filter(Boolean);

    await deleteExistingSourceEvents(db);

    const eventsCollection = db.collection('external_events');
    let eventsWritten = 0;
    for (let i = 0; i < events.length; i += 400) {
      const batch = db.batch();
      const slice = events.slice(i, i + 400);
      slice.forEach((payload) => {
        const docId = buildEventId(payload);
        const ref = eventsCollection.doc(docId);
        batch.set(ref, payload, { merge: true });
      });
      await batch.commit();
      eventsWritten += slice.length;
    }

    await db
      .collection('external_sources')
      .doc(SOURCE_ID)
      .set(
        {
          source: SOURCE_ID,
          sourceUrl: SOURCE_URL,
          lastRunAt: new Date().toISOString(),
          lastSuccessAt: new Date().toISOString(),
          status: 'ok',
          eventCount: eventsWritten,
          durationMs: Date.now() - startedAt,
        },
        { merge: true }
      );

    return NextResponse.json({
      ok: true,
      eventsParsed: events.length,
      eventsWritten,
    });
  } catch (error) {
    await db
      .collection('external_sources')
      .doc(SOURCE_ID)
      .set(
        {
          source: SOURCE_ID,
          sourceUrl: SOURCE_URL,
          lastRunAt: new Date().toISOString(),
          status: 'error',
          lastError: error?.message || 'Sync failed',
          durationMs: Date.now() - startedAt,
        },
        { merge: true }
      );

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Sync failed',
      },
      { status: 500 }
    );
  }
}
