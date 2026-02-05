import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(decodedUser) {
  const email = (decodedUser?.email || '').toLowerCase();
  return decodedUser?.admin === true || ADMIN_EMAILS.includes(email);
}

async function requireAdmin(request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isAdmin(user)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

function buildDateIso(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const UPDATABLE_FIELDS = new Set([
  'title',
  'venue',
  'address',
  'descriptionRaw',
  'startTimeMinutes',
  'endTimeMinutes',
  'eventType',
  'citySlug',
  'city',
  'sourceUrl',
  'imageUrl',
  'latitude',
  'longitude',
]);

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

function buildStableKey(event) {
  if (event?.stableKey) return event.stableKey;
  if (event?.sourceEventId) return `${event.source}:${event.sourceEventId}`;
  const eventKey = event?.eventKey || buildEventKey(event);
  return `${event.source}:key:${eventKey}`;
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const url = new URL(request.url);
    const citySlug = url.searchParams.get('citySlug');

    const db = getFirestore();
    const today = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 28);
    const startIso = buildDateIso(today);
    const endIso = buildDateIso(end);

    let query = db
      .collection('external_events')
      .where('date', '>=', startIso)
      .where('date', '<=', endIso);

    if (citySlug) {
      query = query.where('citySlug', '==', citySlug);
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const stableKeys = Array.from(
      new Set(events.map((event) => buildStableKey(event)).filter(Boolean))
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

    const mergedEvents = events.map((event) => {
      const stableKey = buildStableKey(event);
      const override = stableKey ? overridesMap.get(stableKey) : null;
      if (override?.deleted) {
        return null;
      }
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
    }).filter(Boolean);

    mergedEvents.sort((a, b) => {
      if (a.date === b.date) {
        const aStart = a.startTimeMinutes ?? 9999;
        const bStart = b.startTimeMinutes ?? 9999;
        return aStart - bStart;
      }
      return a.date.localeCompare(b.date);
    });

    return NextResponse.json({ events: mergedEvents });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json();
    const { id, updates, stableKey, forceGeocode } = body || {};
    if (!id || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const sanitized = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (UPDATABLE_FIELDS.has(key)) {
        if (value === undefined) return;
        sanitized[key] = value === '' ? null : value;
      }
    });

    if (!Object.keys(sanitized).length && !forceGeocode) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const db = getFirestore();
    let overrideKey = stableKey;
    if (!overrideKey) {
      const eventDoc = await db.collection('external_events').doc(id).get();
      if (!eventDoc.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      overrideKey = buildStableKey({ id, ...eventDoc.data() });
    }

    const needsGeocode =
      forceGeocode ||
      ((sanitized.address || sanitized.city || sanitized.citySlug) &&
        sanitized.latitude === undefined &&
        sanitized.longitude === undefined);

    if (needsGeocode) {
      const eventDoc = await db.collection('external_events').doc(id).get();
      const base = eventDoc.exists ? eventDoc.data() : {};
      const overrideDoc = await db.collection('external_event_overrides').doc(overrideKey).get();
      const override = overrideDoc.exists ? overrideDoc.data() : {};
      const address = sanitized.address || override.address || base.address || '';
      const city = sanitized.city || override.city || base.city || '';
      const fullAddress = [address, city].filter(Boolean).join(', ');
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (apiKey && fullAddress) {
        try {
          const geoUrl =
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}` +
            `&key=${apiKey}`;
          const geoRes = await fetch(geoUrl);
          if (geoRes.ok) {
            const geoJson = await geoRes.json();
            const location = geoJson?.results?.[0]?.geometry?.location;
            if (location) {
              sanitized.latitude = location.lat;
              sanitized.longitude = location.lng;
            }
          }
        } catch (error) {
          // Ignore geocode failures; allow manual save without lat/lng
        }
      }
    }

    await db.collection('external_event_overrides').doc(overrideKey).set(sanitized, { merge: true });

    return NextResponse.json({
      ok: true,
      latitude: sanitized.latitude ?? null,
      longitude: sanitized.longitude ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json();
    const mode = body?.mode || '';
    if (mode === 'debug-env') {
      return NextResponse.json({
        ok: true,
        hasServerKey: Boolean(process.env.GOOGLE_MAPS_API_KEY),
        hasPublicKey: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
      });
    }

    if (mode !== 'bulk-geocode') {
      return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 });
    }

    const db = getFirestore();
    const citySlug = body?.citySlug || '';
    const force = Boolean(body?.force);
    const today = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 28);
    const startIso = buildDateIso(today);
    const endIso = buildDateIso(end);

    let query = db
      .collection('external_events')
      .where('date', '>=', startIso)
      .where('date', '<=', endIso);
    if (citySlug) {
      query = query.where('citySlug', '==', citySlug);
    }
    const snapshot = await query.get();

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const overridesCollection = db.collection('external_event_overrides');

    let geocoded = 0;
    let skipped = 0;

    for (const event of events) {
      const stableKey = buildStableKey(event);
      if (!stableKey) {
        skipped += 1;
        continue;
      }

      const overrideDoc = await overridesCollection.doc(stableKey).get();
      if (!force && overrideDoc.exists) {
        const data = overrideDoc.data() || {};
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          skipped += 1;
          continue;
        }
      }

      const address = event.address || '';
      const city = event.city || event.citySlug || '';
      const fullAddress = [address, city].filter(Boolean).join(', ');
      if (!fullAddress) {
        skipped += 1;
        continue;
      }

      try {
        const geoUrl =
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}` +
          `&key=${apiKey}`;
        const geoRes = await fetch(geoUrl);
        if (!geoRes.ok) {
          skipped += 1;
          continue;
        }
        const geoJson = await geoRes.json();
        if (geoJson?.status && geoJson.status !== 'OK') {
          skipped += 1;
          continue;
        }
        const location = geoJson?.results?.[0]?.geometry?.location;
        if (!location) {
          skipped += 1;
          continue;
        }
        await overridesCollection.doc(stableKey).set(
          {
            latitude: location.lat,
            longitude: location.lng,
          },
          { merge: true }
        );
        geocoded += 1;
      } catch (error) {
        skipped += 1;
      }
    }

    return NextResponse.json({ ok: true, geocoded, skipped });
  } catch (error) {
    console.error('Bulk geocode failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Bulk geocode failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json();
    const { id, stableKey } = body || {};
    if (!id && !stableKey) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getFirestore();
    let overrideKey = stableKey;
    if (!overrideKey) {
      const eventDoc = await db.collection('external_events').doc(id).get();
      if (!eventDoc.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      overrideKey = buildStableKey({ id, ...eventDoc.data() });
    }

    await db.collection('external_event_overrides').doc(overrideKey).set(
      { deleted: true },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete event' },
      { status: 500 }
    );
  }
}
