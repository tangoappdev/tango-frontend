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
  'date',
  'startTimeMinutes',
  'endTimeMinutes',
  'eventType',
  'citySlug',
  'city',
  'sourceUrl',
  'imageUrl',
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
      return {
        ...event,
        stableKey,
        ...(override || {}),
      };
    });

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
    const { id, updates, stableKey } = body || {};
    if (!id || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const sanitized = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (UPDATABLE_FIELDS.has(key)) {
        sanitized[key] = value === '' ? null : value;
      }
    });

    if (!Object.keys(sanitized).length) {
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
    await db.collection('external_event_overrides').doc(overrideKey).set(sanitized, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}
