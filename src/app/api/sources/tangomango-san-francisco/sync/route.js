import crypto from 'crypto';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getFirestore } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_ID = 'tangomango-san-francisco';
const SOURCE_URL =
  'https://www.tangomango.org/index.php?show=San_Francisco,CA+Alameda,CA+San_Mateo,CA+Santa_Clara,CA+Marin,CA+Contra_Costa,CA+Sacramento,CA+Santa_Cruz,CA+Monterey,CA+Sonoma,CA+Mendocino,CA+Stanislaus,CA';
const SOURCE_BASE = 'https://www.tangomango.org';
const CITY_NAME = 'San Francisco & No. California';
const CITY_SLUG = 'san-francisco';
const CITY_TIMEZONE = 'America/Los_Angeles';

function normalizeWhitespace(value) {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
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

function parseTimeToken(token) {
  if (!token) return null;
  const cleaned = token.toLowerCase().replace(/\s+/g, '');
  const match = cleaned.match(/(\d{1,2})(?::|\.|h)?(\d{2})?(a|p|am|pm)?/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3] || '';
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const mer = meridiem.startsWith('p')
    ? 'pm'
    : meridiem.startsWith('a')
      ? 'am'
      : null;
  if (mer === 'pm' && hours < 12) hours += 12;
  if (mer === 'am' && hours === 12) hours = 0;

  return { hours, minutes, meridiem: mer };
}

function parseTimeRange(text) {
  if (!text) return { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  const normalized = text.replace(/\s+/g, ' ');
  const rangeMatch = normalized.match(
    /(\d{1,2}(?::\d{2})?\s*(?:a|p|am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:a|p|am|pm)?)/i
  );
  if (!rangeMatch) {
    return { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  }

  const startToken = rangeMatch[1];
  const endToken = rangeMatch[2];
  const start = parseTimeToken(startToken);
  const end = parseTimeToken(endToken);
  let startMinutes = start ? start.hours * 60 + start.minutes : null;
  let endMinutes = end ? end.hours * 60 + end.minutes : null;

  if (start && end && !end.meridiem && start.meridiem) {
    const adjusted = parseTimeToken(`${endToken}${start.meridiem}`);
    if (adjusted) {
      endMinutes = adjusted.hours * 60 + adjusted.minutes;
    }
  }

  return {
    startMinutes,
    endMinutes,
    timeRangeRaw: rangeMatch[0].trim(),
  };
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
  if (!text) return null;
  if (/pr[áa]ctica/i.test(text)) return 'practica';
  if (/milonga/i.test(text)) return 'milonga';
  return null;
}

function buildEventId(payload) {
  const hash = crypto
    .createHash('sha1')
    .update(`${payload.source}|${payload.date}|${payload.title}|${payload.eventId || ''}`)
    .digest('hex');
  return `${payload.source}-${hash.slice(0, 20)}`;
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

async function fetchEventDetails({ date, eventId }) {
  const url = `${SOURCE_BASE}/lib/loadevent.php?date=${date}&eventid=${eventId}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = normalizeWhitespace($('td.styled').first().text());
  const detailsHtml = $('#details').html() || '';
  const lines = splitLinesFromHtml(detailsHtml);

  let timeLineIndex = -1;
  let timeInfo = { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  let eventType = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const candidate = parseTimeRange(line);
    if (candidate.timeRangeRaw) {
      timeLineIndex = i;
      timeInfo = candidate;
      eventType = detectEventType(line);
      break;
    }
  }

  const remaining = timeLineIndex >= 0 ? lines.slice(timeLineIndex + 1) : lines;
  const filtered = remaining.filter(
    (line) =>
      !/^keywords?:/i.test(line) &&
      !/^if anything/i.test(line) &&
      !/^highlight/i.test(line) &&
      line.toLowerCase() !== 'map'
  );

  let venue = null;
  let address = null;
  let description = null;

  const venueIndex = filtered.findIndex(
    (line) => !/\$/.test(line) && !/donation|free|cost/i.test(line)
  );
  if (venueIndex > -1) {
    venue = filtered[venueIndex];
  }

  const streetIndex = filtered.findIndex((line) => /\d/.test(line) && /street|st\b|ave|road|blvd|way|boulevard|drive|dr\b/i.test(line));
  if (streetIndex > -1) {
    const street = filtered[streetIndex];
    const cityLine = filtered[streetIndex + 1] || '';
    if (cityLine && /,\s*[A-Z]{2}\b/.test(cityLine)) {
      address = `${street}, ${cityLine}`;
    } else {
      address = street;
    }
  }

  const descriptionStart = Math.max(venueIndex + 1, streetIndex + 2);
  const descriptionLines = filtered.slice(descriptionStart).filter((line) => line && !/^keywords?:/i.test(line));
  if (descriptionLines.length) {
    description = descriptionLines.join(' ');
  }

  return {
    title: title || null,
    venue: venue || null,
    address: address || null,
    descriptionRaw: description || null,
    eventType,
    ...timeInfo,
    sourceUrl: `${SOURCE_BASE}/link.php?eventid=${eventId}&date=${date}`,
  };
}

async function mapWithConcurrency(items, worker, concurrency = 6) {
  const results = [];
  let index = 0;

  async function run() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
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
    const eventNodes = $('div[id^="e"][onclick]').toArray();

    const baseEvents = eventNodes
      .map((node) => {
        const element = $(node);
        const onclick = element.attr('onclick') || '';
        const match = onclick.match(/loadevent\([^']*'(\d{4}-\d{2}-\d{2})',(\d+),/);
        if (!match) return null;
        const date = match[1];
        const eventId = match[2];
        const rawTitle = normalizeWhitespace(element.text());
        return { date, eventId, rawTitle };
      })
      .filter(Boolean);

    const detailResults = await mapWithConcurrency(baseEvents, (base) => fetchEventDetails(base), 6);

    const events = baseEvents.map((base, idx) => {
      const details = detailResults[idx] || {};
      const title = details.title || base.rawTitle || 'Untitled event';
      const eventType = details.eventType || detectEventType(title);

      return {
        source: SOURCE_ID,
        sourceUrl: details.sourceUrl || SOURCE_URL,
        city: CITY_NAME,
        citySlug: CITY_SLUG,
        date: base.date,
        title,
        venue: details.venue || null,
        address: details.address || null,
        descriptionRaw: details.descriptionRaw || null,
        tagsRaw: [],
        links: [],
        scrapedAt: new Date().toISOString(),
        status: 'active',
        timeRangeRaw: details.timeRangeRaw || null,
        startTimeMinutes: details.startMinutes ?? null,
        endTimeMinutes: details.endMinutes ?? null,
        eventType,
        recurring: false,
        frequencyRaw: null,
        dayOfWeek: getDayOfWeek(base.date),
        eventId: base.eventId,
      };
    }).filter((event) => event.eventType === 'milonga' || event.eventType === 'practica');

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
