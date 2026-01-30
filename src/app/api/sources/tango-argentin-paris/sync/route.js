import crypto from 'crypto';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getFirestore } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_ID = 'tango-argentin-paris';
const SOURCE_URL = 'https://tango-argentin.fr/en/paris';
const CITY_NAME = 'Paris';
const CITY_SLUG = 'paris';
const CITY_TIMEZONE = 'Europe/Paris';

const DATE_HEADING_RE =
  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i;
const TIME_RE = /(\d{1,2}:\d{2}\s?(?:am|pm))/i;
const RANGE_RE = /from\s+(\d{1,2}:\d{2}\s?(?:am|pm))\s+to\s+(\d{1,2}:\d{2}\s?(?:am|pm))/i;

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function normalizeWhitespace(value) {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
}

function buildEventId(payload) {
  const hash = crypto
    .createHash('sha1')
    .update(`${payload.source}|${payload.date}|${payload.title}|${payload.startTimeMinutes || ''}`)
    .digest('hex');
  return `${payload.source}-${hash.slice(0, 20)}`;
}

function toDateIso(day, monthName, year) {
  const monthIndex = MONTHS[monthName.toLowerCase()];
  if (monthIndex === undefined) return null;
  const date = new Date(Date.UTC(Number(year), monthIndex, Number(day)));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
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

function parseTimeToken(token) {
  if (!token) return null;
  const cleaned = token.toLowerCase().replace(/\s+/g, '');
  const match = cleaned.match(/(\d{1,2})(?::(\d{2}))?(am|pm)?/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3] || '';
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
}

function parseTimeRange(text) {
  if (!text) return { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  const match = text.match(RANGE_RE);
  if (!match) return { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  const start = parseTimeToken(match[1]);
  const end = parseTimeToken(match[2]);
  return {
    startMinutes: start ? start.hours * 60 + start.minutes : null,
    endMinutes: end ? end.hours * 60 + end.minutes : null,
    timeRangeRaw: `${match[1]} - ${match[2]}`,
  };
}

function detectEventType(text) {
  if (!text) return null;
  if (/practica|pratique/i.test(text)) return 'practica';
  if (/milonga/i.test(text)) return 'milonga';
  return null;
}

function parseEventRow($, row) {
  const time = normalizeWhitespace($(row).find('td').first().text());
  const title = normalizeWhitespace($(row).find('span[onclick]').first().text());
  const detailSpan = $(row).find('span[style*="font-size:0.8rem"]').first();
  const detailsText = normalizeWhitespace(detailSpan.text());
  const rangeInfo = parseTimeRange(detailsText);

  const addressMatch = detailsText.match(/\d{1,5}[^@]*?(?=from|$)/i);
  const address = addressMatch ? normalizeWhitespace(addressMatch[0]) : null;

  const priceMatch = detailsText.match(/(\d+\s?euros?|\bau chapeau\b|\bfree\b|\bgratuit\b)/i);
  const price = priceMatch ? normalizeWhitespace(priceMatch[0]) : null;

  return {
    time,
    title,
    address,
    price,
    ...rangeInfo,
  };
}

function splitLinesFromHtml(html) {
  if (!html) return [];
  let normalized = html;
  normalized = normalized.replace(/<br\s*\/?>/gi, '\n');
  normalized = normalized.replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h\d>|<\/table>|<\/ul>|<\/ol>/gi, '\n');
  normalized = normalized.replace(/<p[^>]*>|<div[^>]*>|<li[^>]*>|<tr[^>]*>|<td[^>]*>|<h\d[^>]*>|<table[^>]*>|<ul[^>]*>|<ol[^>]*>/gi, '');
  return normalized
    .split('\n')
    .map((line) => normalizeWhitespace(cheerio.load(line).text()))
    .filter(Boolean);
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

    const html = await res.text();
    const $ = cheerio.load(html);
    const events = [];

    $('h6').each((_, heading) => {
      const headingText = normalizeWhitespace($(heading).text());
      const dateMatch = headingText.match(DATE_HEADING_RE);
      if (!dateMatch) return;
      const [, , day, monthName, year] = dateMatch;
      const date = toDateIso(day, monthName, year);
      if (!date) return;

      const table = $(heading).nextAll('table').first();
      if (!table.length) return;

      table.find('tbody tr').each((__, row) => {
        const parsed = parseEventRow($, row);
        if (!parsed.title) return;
        if (!parsed.time && !parsed.timeRangeRaw) return;

        const eventType = detectEventType(parsed.title) || detectEventType(parsed.address) || 'milonga';

        events.push({
          source: SOURCE_ID,
          sourceUrl: SOURCE_URL,
          city: CITY_NAME,
          citySlug: CITY_SLUG,
          date,
          title: parsed.title,
          venue: null,
          address: parsed.address,
          descriptionRaw: parsed.price || null,
          tagsRaw: [],
          links: [],
          scrapedAt: new Date().toISOString(),
          status: 'active',
          timeRangeRaw: parsed.timeRangeRaw,
          startTimeMinutes: parsed.startMinutes,
          endTimeMinutes: parsed.endMinutes,
          eventType,
          recurring: false,
          frequencyRaw: null,
          dayOfWeek: getDayOfWeek(date),
        });
      });
    });

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
