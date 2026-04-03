import crypto from 'crypto';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getFirestore } from '@/lib/firebaseAdmin.server';
import { geocodeSourceEvents } from '@/lib/geocodeSourceEvents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_ID = 'newyorktango';
const SOURCE_URL = 'https://newyorktango.com/';
const CITY_NAME = 'New York';
const CITY_SLUG = 'new-york';

const DATE_LABEL_RE =
  /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+[A-Z][a-z]{2}\s+\d{1,2}\b/;
const TAGS_LINE_RE = /^[A-Z0-9+]+(?:-[A-Z0-9+]+)+$/;
const DAY_NAME_RE = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i;

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeTitleKey(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeDayName(value) {
  if (!value) return null;
  const key = value.slice(0, 3).toLowerCase();
  const map = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  };
  return map[key] || null;
}

function parseDateLabel(label, now = new Date()) {
  if (!label) return null;
  const match = label.match(
    /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+([A-Z][a-z]{2})\s+(\d{1,2})\b/
  );
  if (!match) return null;
  const dayName = normalizeDayName(match[1]);
  const monthName = match[2];
  const day = Number(match[3]);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = months.indexOf(monthName);
  if (monthIndex < 0 || Number.isNaN(day)) return null;

  const currentMonth = now.getMonth();
  let year = now.getFullYear();
  if (monthIndex < currentMonth - 1) year += 1;
  if (monthIndex > currentMonth + 1) year -= 1;

  const date = new Date(Date.UTC(year, monthIndex, day));
  if (Number.isNaN(date.getTime())) return null;
  return { dateIso: date.toISOString().slice(0, 10), dayOfWeek: dayName };
}

function extractDayOfWeek(text) {
  if (!text) return null;
  const match = text.match(DAY_NAME_RE);
  if (!match) return null;
  return normalizeDayName(match[1]);
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
  if (mer == 'pm' && hours < 12) hours += 12;
  if (mer == 'am' && hours == 12) hours = 0;

  return { hours, minutes, meridiem: mer };
}

function parseTimeRange(text) {
  if (!text) return { startMinutes: null, endMinutes: null, timeRangeRaw: null };
  const normalized = text.replace(/\s+/g, ' ');
  const rangeMatch = normalized.match(
    /(\d{1,2}(?::\d{2})?\s*(?:a|p|am|pm)?)\s*[-?]\s*(\d{1,2}(?::\d{2})?\s*(?:a|p|am|pm)?)/i
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

function extractTags(text) {
  if (!text) return [];
  const tags = new Set();
  const hyphenTags = text.match(/\b[A-Z][A-Z0-9+]*(?:-[A-Z0-9+]+)+\b/g) || [];
  hyphenTags.forEach((tag) => tags.add(tag));
  return Array.from(tags);
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
  return [
    normalizeKey(title),
    normalizeKey(venue),
    normalizeKey(address),
  ].filter(Boolean).join('|');
}

function buildEventId(payload) {
  const hash = crypto
    .createHash('sha1')
    .update(`${payload.source}|${payload.date || 'recurring'}|${payload.title}`)
    .digest('hex');
  return `${payload.source}-${hash.slice(0, 20)}`;
}

function splitLinesFromHtml(html) {
  if (!html) return [];
  let normalized = html;
  normalized = normalized.replace(/<!--[\s\S]*?-->/g, '');
  normalized = normalized.replace(/<br\s*\/?>/gi, '\n');
  normalized = normalized.replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h\d>|<\/table>|<\/ul>|<\/ol>/gi, '\n');
  normalized = normalized.replace(/<p[^>]*>|<div[^>]*>|<li[^>]*>|<tr[^>]*>|<td[^>]*>|<h\d[^>]*>|<table[^>]*>|<ul[^>]*>|<ol[^>]*>/gi, '');
  normalized = normalized.replace(/<[^>]+>/g, '');
  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseEventLine(text) {
  const cleaned = text.replace(/^♫?\s*/, '').trim();
  const timeInfo = parseTimeRange(cleaned);
  let title = cleaned;
  let venue = null;
  let address = null;
  const atIndex = cleaned.indexOf('@');
  if (atIndex >= 0) {
    title = cleaned.slice(0, atIndex).trim();
    const afterAt = cleaned.slice(atIndex + 1).trim();
    let locationPart = afterAt;
    if (timeInfo.timeRangeRaw) {
      const idx = afterAt.toLowerCase().indexOf(timeInfo.timeRangeRaw.toLowerCase());
      if (idx > -1) {
        locationPart = afterAt.slice(0, idx);
      } else {
        locationPart = afterAt.split(';')[0];
      }
    } else {
      locationPart = afterAt.split(';')[0];
    }
    const parenMatch = locationPart.match(/^(.*)\(([^)]+)\)/);
    if (parenMatch) {
      venue = parenMatch[1].trim().replace(/[\s,;:]+$/, '');
      address = parenMatch[2].trim();
    } else if (/\d/.test(locationPart)) {
      address = locationPart.trim();
    } else {
      venue = locationPart.trim();
    }
  } else {
    title = cleaned.split(';')[0].trim();
  }

  // Strip leading time range from title (e.g. "8:30-10p Noches de Tango" → "Noches de Tango")
  title = title
    .replace(/^\d{1,2}(?::\d{2})?\s*(?:a|p|am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:a|p|am|pm)?\s*/i, '')
    .trim();

  if (venue) venue = venue.replace(/^[\s:;,.]+|[\s;,.]+$/g, '').trim();
  if (address) address = address.replace(/^[\s:;,.]+|[\s;,.]+$/g, '').trim();
  if (!title) title = cleaned;

  return { title, venue, address, ...timeInfo };
}

function parseRecurringLine(text) {
  const parts = text.split(' | ');
  if (parts.length < 2) return null;
  const title = parts[0].trim();
  const details = parts.slice(1).join(' | ').trim();

  let venue = null;
  let address = null;
  let frequencyRaw = null;

  const [venuePart, restPart] = details.split(':');
  venue = venuePart ? venuePart.trim() : null;
  const rest = restPart ? restPart.trim() : '';
  const timeInfo = parseTimeRange(rest);

  const firstSentence = rest.split('. ')[0];
  if (firstSentence && /\d/.test(firstSentence)) {
    address = firstSentence.trim();
  }

  if (rest) {
    frequencyRaw = rest.split('.').slice(0, 2).join('.').trim();
  }

  return {
    title,
    venue,
    address,
    frequencyRaw,
    dayOfWeek: extractDayOfWeek(rest) || extractDayOfWeek(details),
    ...timeInfo,
  };
}

function buildVenueAddressIndex(lines) {
  const index = new Map();
  let inRecurring = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/Recurring year-round events/i.test(line)) {
      inRecurring = true;
      continue;
    }
    if (!inRecurring) continue;
    if (!line) continue;

    const title = line;
    let detailLine = '';
    for (let j = 1; j <= 4; j += 1) {
      const candidate = lines[i + j] || '';
      if (!candidate) continue;
      if (/^(Practicas:|Sun,|Mon,|Tue,|Wed,|Thu,|Fri,|Sat,)/i.test(candidate)) break;
      if (/^<a\s+id=|^id=/i.test(candidate)) continue;
      detailLine = candidate;
      if (/[0-9]/.test(candidate) || /:\s*\d/.test(candidate)) break;
    }
    if (!detailLine) {
      continue;
    }
    const key = normalizeTitleKey(title);
    if (!key) continue;
    index.set(key, detailLine);
  }
  return index;
}

function applyVenueAddressFromIndex(event, index) {
  const eventKey = normalizeTitleKey(event.title);
  if (!eventKey || !index.size) return;

  let matchLine = index.get(eventKey);
  if (!matchLine) {
    for (const [key, line] of index.entries()) {
      if (eventKey.includes(key) || key.includes(eventKey)) {
        matchLine = line;
        break;
      }
    }
  }
  if (!matchLine) return;
  if (/^<a\s+id=|^id=/i.test(matchLine)) return;

  let venue = event.venue;
  let address = event.address;

  const colonMatch = matchLine.match(/^([^:]+):\s*(.*)$/);
  if (colonMatch) {
    const venueCandidate = colonMatch[1].trim();
    const rest = colonMatch[2].trim();
    const addressMatch = rest.match(/^([^.;]+)[.;]?/);
    const addressCandidate = addressMatch ? addressMatch[1].trim() : rest;
    if (!venue) venue = venueCandidate;
    if (!address) address = addressCandidate;
  } else if (!address) {
    address = matchLine.trim();
  }

  if (venue) event.venue = venue;
  if (address) event.address = address;
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
    const bodyHtml = $('body').html() || '';
    const lines = splitLinesFromHtml(bodyHtml);
    const venueAddressIndex = buildVenueAddressIndex(lines);

    const now = new Date();
    const events = [];

    let currentDate = null;
    let currentDayOfWeek = null;
    let currentType = 'milonga';
    let lastEvent = null;
    let inRecurring = false;

    for (const rawLine of lines) {
      const lineText = normalizeWhitespace(cheerio.load(rawLine).text());
      if (!lineText) continue;

      if (/Recurring year-round events/i.test(lineText)) {
        inRecurring = true;
        currentDate = null;
        currentDayOfWeek = null;
        lastEvent = null;
        continue;
      }

      if (inRecurring) {
        const recurring = parseRecurringLine(lineText);
        if (!recurring || !recurring.title) continue;
        const payload = {
          source: SOURCE_ID,
          sourceUrl: SOURCE_URL,
          city: CITY_NAME,
          citySlug: CITY_SLUG,
          date: null,
          title: recurring.title,
          venue: recurring.venue || null,
          address: recurring.address || null,
          descriptionRaw: lineText,
          sourceEventId: null,
          eventKey: buildEventKey({
            title: recurring.title,
            venue: recurring.venue,
            address: recurring.address,
          }),
          tagsRaw: extractTags(lineText),
          links: [],
          scrapedAt: new Date().toISOString(),
          status: 'active',
          timeRangeRaw: recurring.timeRangeRaw,
          startTimeMinutes: recurring.startMinutes,
          endTimeMinutes: recurring.endMinutes,
          eventType: 'recurring',
          recurring: true,
          frequencyRaw: recurring.frequencyRaw || null,
          dayOfWeek: recurring.dayOfWeek || null,
        };
        payload.stableKey = payload.sourceEventId
          ? `${payload.source}:${payload.sourceEventId}`
          : `${payload.source}:key:${payload.eventKey}`;
        events.push(payload);
        continue;
      }

      if (/MILONGAS & PRACTICAS ON/i.test(lineText)) continue;
      if (/are closed/i.test(lineText)) continue;

      const dateMatch = lineText.match(DATE_LABEL_RE);
      if (dateMatch) {
        const parsed = parseDateLabel(dateMatch[0], now);
        currentDate = parsed ? parsed.dateIso : null;
        currentDayOfWeek = parsed ? parsed.dayOfWeek : null;
        currentType = 'milonga';
        lastEvent = null;
        continue;
      }

      if (!currentDate) continue;

      if (/^\*\s*\*\s*\*$/.test(lineText) || lineText.includes('* * *')) {
        lastEvent = null;
        continue;
      }

      if (/^Pr[aá]cticas?:?$/i.test(lineText)) {
        currentType = 'practica';
        lastEvent = null;
        continue;
      }

      if (/^No info/i.test(lineText)) continue;
      if (/^M\s*=\s*Milonga/i.test(lineText)) continue;
      if (/^NVO\s*=|^REST\s*=/i.test(lineText)) continue;

      if (TAGS_LINE_RE.test(lineText)) {
        if (lastEvent) {
          const tags = extractTags(lineText);
          lastEvent.tagsRaw = Array.from(new Set([...(lastEvent.tagsRaw || []), ...tags]));
        }
        continue;
      }

      if (/^(FB|Website|FB page|FB group|More info)/i.test(lineText) && lastEvent) {
        continue;
      }

      const { title, venue, address, timeRangeRaw, startMinutes, endMinutes } = parseEventLine(lineText);
      if (!title) continue;

      const payload = {
        source: SOURCE_ID,
        sourceUrl: SOURCE_URL,
        city: CITY_NAME,
        citySlug: CITY_SLUG,
        date: currentDate,
        title,
        venue: venue || null,
        address: address || null,
        descriptionRaw: lineText,
        sourceEventId: null,
        eventKey: buildEventKey({ title, venue, address }),
        tagsRaw: extractTags(lineText),
        links: [],
        scrapedAt: new Date().toISOString(),
        status: 'active',
        timeRangeRaw,
        startTimeMinutes: startMinutes,
        endTimeMinutes: endMinutes,
        eventType: currentType,
        recurring: false,
        dayOfWeek: currentDayOfWeek || null,
      };
      applyVenueAddressFromIndex(payload, venueAddressIndex);
      payload.stableKey = payload.sourceEventId
        ? `${payload.source}:${payload.sourceEventId}`
        : `${payload.source}:key:${payload.eventKey}`;

      events.push(payload);
      lastEvent = payload;
    }

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

    const { geocoded } = await geocodeSourceEvents(db, SOURCE_ID);

    return NextResponse.json({
      ok: true,
      eventsParsed: events.length,
      eventsWritten,
      geocoded,
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
          lastError: error?.message || 'Unknown error',
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
