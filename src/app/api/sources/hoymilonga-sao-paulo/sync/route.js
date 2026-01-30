import crypto from 'crypto';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getFirestore } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_ID = 'hoymilonga-sao-paulo';
const SOURCE_URL = 'https://www.hoy-milonga.com/sao-paulo/en/milongas';
const SOURCE_BASE = 'https://www.hoy-milonga.com';
const CITY_NAME = 'Sao Paulo';
const CITY_SLUG = 'sao-paulo';
const CITY_TIMEZONE = 'America/Sao_Paulo';

function normalizeWhitespace(value) {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
}

function parseJsonLd(raw) {
  const cleaned = raw.trim();
  if (!cleaned) return [];

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    const chunks = cleaned.split(/\}\s*\{/);
    if (chunks.length <= 1) return [];
    return chunks
      .map((chunk) => {
        const json = `${chunk.startsWith('{') ? '' : '{'}${chunk}${chunk.endsWith('}') ? '' : '}'}`;
        try {
          return JSON.parse(json);
        } catch (innerError) {
          return null;
        }
      })
      .filter(Boolean);
  }
}

function parseIsoTime(isoString) {
  if (!isoString) return { date: null, minutes: null };
  const [datePart, timePartRaw] = isoString.split('T');
  if (!timePartRaw) return { date: datePart || null, minutes: null };
  const timePart = timePartRaw.replace(/Z|[+-]\d{2}:?\d{2}$/i, '');
  const [hoursStr, minutesStr] = timePart.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr || 0);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return { date: datePart || null, minutes: null };
  }
  return { date: datePart || null, minutes: hours * 60 + minutes };
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
    .update(`${payload.source}|${payload.date || 'recurring'}|${payload.title}|${payload.startTimeMinutes || ''}`)
    .digest('hex');
  return `${payload.source}-${hash.slice(0, 20)}`;
}

function toFullUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${SOURCE_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeAddress(address) {
  if (!address) return null;
  const street = address.streetAddress ? address.streetAddress.trim() : '';
  const locality = address.addressLocality ? address.addressLocality.trim() : '';
  if (street && locality && !street.includes(locality)) {
    return `${street}, ${locality}`;
  }
  return street || locality || null;
}

function detectEventType(text) {
  if (!text) return 'milonga';
  return /pr[áa]ctica/i.test(text) ? 'practica' : 'milonga';
}

function extractImageUrls(imageField) {
  if (!imageField) return [];
  if (Array.isArray(imageField)) {
    return imageField.map((item) => toFullUrl(String(item))).filter(Boolean);
  }
  if (typeof imageField === 'string') {
    const url = toFullUrl(imageField);
    return url ? [url] : [];
  }
  return [];
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
    const scripts = $('script[type="application/ld+json"]').toArray();

    const events = [];
    scripts.forEach((script) => {
      const raw = $(script).text();
      const entries = parseJsonLd(raw);
      entries.forEach((entry) => {
        if (!entry || entry['@type'] !== 'DanceEvent') return;
        const title = normalizeWhitespace(entry.name || 'Untitled event');
        const description = normalizeWhitespace(entry.description || '');
        const start = parseIsoTime(entry.startDate);
        const end = parseIsoTime(entry.endDate);
        const date = start.date || (entry.startDate ? entry.startDate.slice(0, 10) : null);
        if (!date) return;

        const location = entry.location || {};
        const address = normalizeAddress(location.address || {});
        const venue = normalizeWhitespace(location.name || '');
        const sourceUrl = toFullUrl(entry.url) || SOURCE_URL;
        const eventType = detectEventType(`${title} ${description}`);
        const imageUrls = extractImageUrls(entry.image);

        events.push({
          source: SOURCE_ID,
          sourceUrl,
          city: CITY_NAME,
          citySlug: CITY_SLUG,
          date,
          title,
          venue: venue || null,
          address: address || null,
          descriptionRaw: description || null,
          imageUrl: imageUrls[0] || null,
          imageUrls,
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
