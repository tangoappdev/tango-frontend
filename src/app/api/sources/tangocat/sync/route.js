import crypto from 'crypto';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_ID = 'tangocat';
const SOURCE_URL = 'https://tangocat.net/';

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
  return (value || '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
}

function splitLinesFromHtml(html) {
  if (!html) return [];
  let normalized = html;
  normalized = normalized.replace(/<br\s*\/?>/gi, '\n');
  normalized = normalized.replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h\d>|<\/table>|<\/ul>|<\/ol>/gi, '\n');
  normalized = normalized.replace(/<p[^>]*>|<div[^>]*>|<li[^>]*>|<tr[^>]*>|<td[^>]*>|<h\d[^>]*>|<table[^>]*>|<ul[^>]*>|<ol[^>]*>/gi, '');
  normalized = normalized.replace(/<[^>]+>/g, '');
  return normalized
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function parseDateRange(line, now = new Date()) {
  const clean = normalizeWhitespace(line).replace(/–/g, '-');
  const monthRegex = '(January|February|March|April|May|June|July|August|September|October|November|December)';
  const rangeRegex = new RegExp(`^${monthRegex}\\s+(\\d{1,2})\\s*-\\s*(?:${monthRegex}\\s+)?(\\d{1,2})$`, 'i');
  const singleRegex = new RegExp(`^${monthRegex}\\s+(\\d{1,2})$`, 'i');

  let startMonth = null;
  let endMonth = null;
  let startDay = null;
  let endDay = null;

  const rangeMatch = clean.match(rangeRegex);
  if (rangeMatch) {
    startMonth = MONTHS[rangeMatch[1].toLowerCase()];
    startDay = Number(rangeMatch[2]);
    endMonth = rangeMatch[3] ? MONTHS[rangeMatch[3].toLowerCase()] : startMonth;
    endDay = Number(rangeMatch[4]);
  } else {
    const singleMatch = clean.match(singleRegex);
    if (!singleMatch) return null;
    startMonth = MONTHS[singleMatch[1].toLowerCase()];
    startDay = Number(singleMatch[2]);
    endMonth = startMonth;
    endDay = startDay;
  }

  if (startMonth == null || endMonth == null || Number.isNaN(startDay) || Number.isNaN(endDay)) {
    return null;
  }

  const currentMonth = now.getUTCMonth();
  let startYear = now.getUTCFullYear();
  if (startMonth < currentMonth - 1) startYear += 1;
  if (startMonth > currentMonth + 10) startYear -= 1;

  let endYear = startYear;
  if (endMonth < startMonth) endYear += 1;

  const startDate = new Date(Date.UTC(startYear, startMonth, startDay));
  const endDate = new Date(Date.UTC(endYear, endMonth, endDay));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    dateText: clean,
  };
}

function parseDateFromSlash(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/);
  if (!match) return null;
  const month = Number(match[1]) - 1;
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeKey(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

function parseLocation(line) {
  const cleaned = normalizeWhitespace(line).replace(/^Location Icon Black\s*/i, '');
  if (!cleaned) return { country: null, city: null };
  const parts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { country: parts[0], city: null };
  }
  return { country: parts[0], city: parts.slice(1).join(', ') };
}

async function geocodeCityCountry(city, country, apiKey) {
  if (!apiKey) return null;
  const query = [city, country].filter(Boolean).join(', ');
  if (!query) return null;
  const geoUrl =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}` +
    `&key=${apiKey}`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) return null;
  const geoJson = await geoRes.json();
  const location = geoJson?.results?.[0]?.geometry?.location;
  if (!location) return null;
  return { lat: location.lat, lng: location.lng };
}

function buildDocId(payload) {
  const hash = crypto
    .createHash('sha1')
    .update(`${payload.title}|${payload.city}|${payload.country}|${payload.startDate}`)
    .digest('hex');
  return `${SOURCE_ID}-${hash.slice(0, 20)}`;
}

function extractFestivalObjects(html) {
  if (!html) return [];
  const matches = html.match(/\{"title":.*?"onClickedCluster":null\}/gs) || [];
  const results = [];
  matches.forEach((match) => {
    try {
      const parsed = JSON.parse(match);
      if (parsed && parsed.title) {
        results.push(parsed);
      }
    } catch (error) {
      // ignore bad JSON blocks
    }
  });
  return results;
}

function parseDateRangeText(value, now = new Date()) {
  if (!value) return null;
  const clean = normalizeWhitespace(value).replace(/–/g, '-');
  const monthRegex = '(January|February|March|April|May|June|July|August|September|October|November|December)';
  const rangeRegex = new RegExp(
    `^${monthRegex}\\s+(\\d{1,2})\\s*-\\s*(?:${monthRegex}\\s+)?(\\d{1,2})$`,
    'i'
  );
  const match = clean.match(rangeRegex);
  if (!match) return null;

  const startMonth = MONTHS[match[1].toLowerCase()];
  const startDay = Number(match[2]);
  const endMonth = match[3] ? MONTHS[match[3].toLowerCase()] : startMonth;
  const endDay = Number(match[4]);

  if (
    startMonth == null ||
    endMonth == null ||
    Number.isNaN(startDay) ||
    Number.isNaN(endDay)
  ) {
    return null;
  }

  const currentMonth = now.getUTCMonth();
  let startYear = now.getUTCFullYear();
  if (startMonth < currentMonth - 1) startYear += 1;
  if (startMonth > currentMonth + 10) startYear -= 1;

  let endYear = startYear;
  if (endMonth < startMonth) endYear += 1;

  const startDate = new Date(Date.UTC(startYear, startMonth, startDay));
  const endDate = new Date(Date.UTC(endYear, endMonth, endDay));
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    dateText: clean,
  };
}

async function fetchOgImage(url) {
  if (!url) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) return ogImage;
    return $('meta[name="twitter:image"]').attr('content') || null;
  } catch (error) {
  } finally {
    clearTimeout(timeoutId);
  }
  try {
    const proxyUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
    const proxyRes = await fetch(proxyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!proxyRes.ok) return null;
    const proxyText = await proxyRes.text();
    const ogMatch = proxyText.match(/property="og:image" content="([^"]+)"/i);
    if (ogMatch?.[1]) return ogMatch[1];
    const twMatch = proxyText.match(/name="twitter:image" content="([^"]+)"/i);
    return twMatch?.[1] || null;
  } catch (error) {
    return null;
  }
}

function guessImageExtension(url, contentType) {
  if (contentType) {
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  }
  const match = url?.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i);
  if (match) return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  return 'jpg';
}

async function cacheImageToStorage(imageUrl) {
  if (!imageUrl) return null;
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const hash = crypto.createHash('sha1').update(imageUrl).digest('hex');
    const basePath = `festivals/${hash}`;
    let filePath = basePath;
    let file = bucket.file(filePath);
    let [exists] = await file.exists().catch(() => [false]);
    if (!exists) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(imageUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          },
        });
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const ext = guessImageExtension(imageUrl, contentType);
        if (ext) {
          filePath = `${basePath}.${ext}`;
          file = bucket.file(filePath);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        await file.save(buffer, {
          contentType,
          metadata: {
            cacheControl: 'public, max-age=31536000',
          },
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } else {
      // If a legacy object exists without extension, keep using it.
      file = bucket.file(filePath);
    }

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
    });
    return signedUrl;
  } catch (error) {
    return null;
  }
}

async function deleteExistingSourceItems(db) {
  const collection = db.collection('external_festivals');
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

    const events = [];
    let imageFetches = 0;
    const MAX_IMAGE_FETCHES = Number.MAX_SAFE_INTEGER;
    let imageAttempts = 0;
    let imageHits = 0;
    let geocodeFetches = 0;
    const MAX_GEOCODES = 500;
    const geocodeCache = new Map();
    const geocodeKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const jsonItems = extractFestivalObjects(html);
    const jsonIndex = new Map();
    if (jsonItems.length) {
      for (const item of jsonItems) {
        const title = normalizeWhitespace(item.title);
        if (!title) continue;
        const startDate =
          (item.startDate && item.startDate.slice(0, 10)) || parseDateFromSlash(item.ds);
        if (!startDate) continue;
        const locationText = normalizeWhitespace(item.l || '');
        const key = `${normalizeKey(title)}|${startDate}|${normalizeKey(locationText)}`;
        const coords = item.coords || {};
        const lat = typeof coords.lat === 'number' ? coords.lat : null;
        const lng = typeof coords.lng === 'number' ? coords.lng : null;
        jsonIndex.set(key, { lat, lng });
      }
    }

    const listItems = $('.event-list li')
      .toArray()
      .filter((node) => !$(node).find('img.ad__im').length);

    if (listItems.length) {
      for (const node of listItems) {
        try {
          const title = normalizeWhitespace($(node).find('p.mb-1').first().text());
          const dateText = normalizeWhitespace($(node).find('p.small.mb-1').first().text());
          const locationText = normalizeWhitespace(
            $(node).find('button.btn-tc-location').text()
          ).replace(/^Location Icon Black\s*/i, '');
          const websiteHref = $(node).find('a.btn-tc-link').attr('href');

          if (!title || !dateText) continue;
          const dateInfo = parseDateRangeText(dateText);
          if (!dateInfo) continue;
          const { country, city } = parseLocation(locationText);
          let latitude = null;
          let longitude = null;
          const cacheKey = `${normalizeKey(city)}|${normalizeKey(country)}`;
          if (cacheKey !== '|' && geocodeCache.has(cacheKey)) {
            const cached = geocodeCache.get(cacheKey);
            latitude = cached?.lat ?? null;
            longitude = cached?.lng ?? null;
          } else if (geocodeFetches < MAX_GEOCODES) {
            try {
              const coords = await geocodeCityCountry(city, country, geocodeKey);
              geocodeFetches += 1;
              if (coords) {
                geocodeCache.set(cacheKey, coords);
                latitude = coords.lat;
                longitude = coords.lng;
              }
            } catch (error) {
              geocodeFetches += 1;
            }
          }
          let website = null;
          if (websiteHref) {
            try {
              website = new URL(websiteHref, SOURCE_URL).toString();
            } catch (error) {
              website = null;
            }
          }
          if (website && website.includes('tangocat.net/go/')) {
            try {
              const goRes = await fetch(website, { redirect: 'manual' });
              const location = goRes.headers.get('location');
              if (location) {
                website = new URL(location, SOURCE_URL).toString();
              }
            } catch (error) {
              // keep original website
            }
          }
          let imageUrl = null;
          if (
            website &&
            imageFetches < MAX_IMAGE_FETCHES &&
            !/facebook\.com|fb\.me|instagram\.com/i.test(website)
          ) {
            const ogImage = await fetchOgImage(website);
            imageFetches += 1;
            imageAttempts += 1;
            if (ogImage) {
              const cached = await cacheImageToStorage(ogImage);
              if (cached) {
                imageUrl = cached;
                imageHits += 1;
              }
            }
          }

          events.push({
            source: SOURCE_ID,
            sourceUrl: SOURCE_URL,
            title,
            city: city || null,
            country: country || null,
            startDate: dateInfo.startDate,
            endDate: dateInfo.endDate,
            dateText: dateInfo.dateText,
            website,
            imageUrl,
            latitude,
            longitude,
            scrapedAt: new Date().toISOString(),
            status: 'active',
          });
        } catch (error) {
          // skip malformed entry
        }
      }
    } else {
      if (jsonItems.length) {
        for (const item of jsonItems) {
          try {
            const title = normalizeWhitespace(item.title);
            if (!title) continue;
            const locationText = normalizeWhitespace(item.l || '');
            const { country, city } = parseLocation(locationText);
            const startDate =
              (item.startDate && item.startDate.slice(0, 10)) || parseDateFromSlash(item.ds);
            const endDate =
              (item.endDate && item.endDate.slice(0, 10)) ||
              parseDateFromSlash(item.de) ||
              startDate;
            if (!startDate) continue;
            const website = item.url || null;
            let imageUrl = null;
            if (
              website &&
              imageFetches < MAX_IMAGE_FETCHES &&
              !/facebook\.com|fb\.me|instagram\.com/i.test(website)
            ) {
              const ogImage = await fetchOgImage(website);
              imageFetches += 1;
              imageAttempts += 1;
              if (ogImage) {
                const cached = await cacheImageToStorage(ogImage);
                if (cached) {
                  imageUrl = cached;
                  imageHits += 1;
                }
              }
            }
            let latitude = null;
            let longitude = null;
            const cacheKey = `${normalizeKey(city)}|${normalizeKey(country)}`;
            if (cacheKey !== '|' && geocodeCache.has(cacheKey)) {
              const cached = geocodeCache.get(cacheKey);
              latitude = cached?.lat ?? null;
              longitude = cached?.lng ?? null;
            } else if (geocodeFetches < MAX_GEOCODES) {
              try {
                const coords = await geocodeCityCountry(city, country, geocodeKey);
                geocodeFetches += 1;
                if (coords) {
                  geocodeCache.set(cacheKey, coords);
                  latitude = coords.lat;
                  longitude = coords.lng;
                }
              } catch (error) {
                geocodeFetches += 1;
              }
            }
            events.push({
              source: SOURCE_ID,
              sourceUrl: SOURCE_URL,
              title,
              city: city || null,
              country: country || null,
              startDate,
              endDate,
              dateText: null,
              website,
              imageUrl,
              latitude,
              longitude,
              scrapedAt: new Date().toISOString(),
              status: 'active',
            });
          } catch (error) {
            // skip malformed entry
          }
        }
      }
    }

    if (!events.length) {
      return NextResponse.json(
        { ok: true, eventsParsed: 0, eventsWritten: 0, note: 'No events found in source.' },
        { status: 200 }
      );
    }
    await deleteExistingSourceItems(db);

    const collection = db.collection('external_festivals');
    let written = 0;
    for (let i = 0; i < events.length; i += 400) {
      const batch = db.batch();
      const slice = events.slice(i, i + 400);
      slice.forEach((payload) => {
        const docId = buildDocId(payload);
        batch.set(collection.doc(docId), payload, { merge: true });
      });
      await batch.commit();
      written += slice.length;
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
          eventCount: written,
          durationMs: Date.now() - startedAt,
        },
        { merge: true }
      );

    return NextResponse.json({
      ok: true,
      eventsParsed: events.length,
      eventsWritten: written,
      imageAttempts,
      imageHits,
      geocodeFetches,
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
      { ok: false, error: error?.message || 'Sync failed', stack: error?.stack },
      { status: 500 }
    );
  }
}
