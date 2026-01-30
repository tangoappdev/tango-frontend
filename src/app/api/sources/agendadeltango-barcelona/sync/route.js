import crypto from 'crypto';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getFirestore } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_ID = 'agendadeltango-barcelona';
const SOURCE_URL = 'https://agendadeltango.com/milongas-barcelona/';
const CITY_NAME = 'Barcelona';
const CITY_SLUG = 'barcelona';
const CITY_TIMEZONE = 'Europe/Madrid';

function normalizeWhitespace(value) {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
}

function parseDate(dateText) {
  const match = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!day || !month || !year) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseTimeToken(token) {
  if (!token) return null;
  const cleaned = token.replace(/\s+/g, '');
  const match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
}

function parseTimeRange(text) {
  if (!text) return { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  const normalized = text.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/(\d{1,2}:\d{2})\s*(?:-|a)\s*(\d{1,2}:\d{2})/i);
  if (!match) {
    const single = normalized.match(/(\d{1,2}:\d{2})/);
    if (single) {
      const start = parseTimeToken(single[1]);
      return {
        startMinutes: start ? start.hours * 60 + start.minutes : null,
        endMinutes: null,
        timeRangeRaw: single[1],
      };
    }
    return { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  }
  const start = parseTimeToken(match[1]);
  const end = parseTimeToken(match[2]);
  return {
    startMinutes: start ? start.hours * 60 + start.minutes : null,
    endMinutes: end ? end.hours * 60 + end.minutes : null,
    timeRangeRaw: `${match[1]} - ${match[2]}`,
  };
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

function extractEventIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/milonga\/([^/]+)\//i);
  return match ? match[1] : null;
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

function buildEventId(payload) {
  const hash = crypto
    .createHash('sha1')
    .update(`${payload.source}|${payload.date}|${payload.title}|${payload.startTimeMinutes || ''}`)
    .digest('hex');
  return `${payload.source}-${hash.slice(0, 20)}`;
}

function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://agendadeltango.com${url.startsWith('/') ? '' : '/'}${url}`;
}

async function fetchDetailDetails(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const address = normalizeWhitespace($('.drts-location-address').first().text());
    const imageUrl = $('.directory-listing-photos img').first().attr('src');
    return {
      address: address || null,
      imageUrl: imageUrl ? normalizeUrl(imageUrl) : null,
    };
  } catch (error) {
    return null;
  }
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
    if (!res.ok) throw new Error(`Failed to fetch source: ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const events = [];
    const pendingDetails = [];

    $('.cal-dia').each((_, dayBlock) => {
      const dateText = normalizeWhitespace($(dayBlock).find('.cal-dia-fecha').first().text());
      const date = parseDate(dateText);
      if (!date) return;

      $(dayBlock)
        .find('.cal-evento')
        .each((__, eventNode) => {
          const typeText = normalizeWhitespace($(eventNode).find('.tipo').first().text());
          if (!/milonga|practica/i.test(typeText)) return;

          const timeText = normalizeWhitespace($(eventNode).find('.hora').first().text());
          const { startMinutes, endMinutes, timeRangeRaw } = parseTimeRange(timeText);
          const title = normalizeWhitespace($(eventNode).find('.milonga a').first().text());
          const rawUrl = $(eventNode).find('.milonga a').first().attr('href') || SOURCE_URL;
          const sourceUrl = normalizeUrl(rawUrl) || SOURCE_URL;
          const cityLabel = normalizeWhitespace($(eventNode).find('.ciudad').first().text());

          if (!title) return;

          const sourceEventId = extractEventIdFromUrl(sourceUrl);
          const eventKey = buildEventKey({ title, venue: null, address: cityLabel });
          const eventType = /practica/i.test(typeText) ? 'practica' : 'milonga';

          const payload = {
            source: SOURCE_ID,
            sourceUrl,
            city: CITY_NAME,
            citySlug: CITY_SLUG,
            date,
            title,
            venue: null,
            address: cityLabel || null,
            descriptionRaw: null,
            imageUrl: null,
            sourceEventId,
            eventKey,
            tagsRaw: [],
            links: [],
            scrapedAt: new Date().toISOString(),
            status: 'active',
            timeRangeRaw,
            startTimeMinutes: startMinutes,
            endTimeMinutes: endMinutes,
            eventType,
            recurring: false,
            frequencyRaw: null,
            dayOfWeek: getDayOfWeek(date),
            stableKey: sourceEventId
              ? `${SOURCE_ID}:${sourceEventId}`
              : `${SOURCE_ID}:key:${eventKey}`,
          };
          events.push(payload);
          pendingDetails.push({ index: events.length - 1, url: sourceUrl });
        });
    });

    const detailResults = await mapWithConcurrency(
      pendingDetails,
      async (item) => ({
        index: item.index,
        details: await fetchDetailDetails(item.url),
      }),
      6
    );

    detailResults.forEach((result) => {
      const details = result?.details;
      if (!details) return;
      if (details.address) {
        events[result.index].address = details.address;
      }
      if (details.imageUrl) {
        events[result.index].imageUrl = details.imageUrl;
      }
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
