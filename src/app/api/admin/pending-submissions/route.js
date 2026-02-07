import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server';
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

const slugify = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function guessExtension(contentType, url) {
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  const match = url?.match(/\.(jpg|jpeg|png|webp)(\?|#|$)/i);
  if (match) return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  return 'jpg';
}

const RECURRENCE_DAYS_AHEAD = 28;
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const addDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const uniqueDates = (dates) => {
  const set = new Set();
  dates.forEach((date) => set.add(date));
  return Array.from(set).sort();
};

const getMonthWeekday = (year, monthIndex, weekNumber, dayIndex) => {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const firstDay = first.getUTCDay();
  let offset = dayIndex - firstDay;
  if (offset < 0) offset += 7;
  const day = 1 + offset + (weekNumber - 1) * 7;
  const candidate = new Date(Date.UTC(year, monthIndex, day));
  if (candidate.getUTCMonth() !== monthIndex) return null;
  return candidate;
};

const buildRecurrenceDates = (startDate, recurrence) => {
  if (!startDate || !recurrence) return [startDate].filter(Boolean);
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return [startDate];
  const end = addDays(start, RECURRENCE_DAYS_AHEAD);
  const dates = [];

  if (recurrence.type === 'weekly' && Array.isArray(recurrence.weeklyDays)) {
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      const dayIndex = cursor.getUTCDay();
      if (recurrence.weeklyDays.includes(dayIndex)) {
        dates.push(toDateKey(cursor));
      }
    }
  }

  if (recurrence.type === 'monthly' && Array.isArray(recurrence.monthlyRules)) {
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cursor <= end) {
      recurrence.monthlyRules.forEach((rule) => {
        if (!rule?.week || rule?.day === undefined) return;
        const date = getMonthWeekday(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth(),
          rule.week,
          rule.day
        );
        if (!date) return;
        if (date >= start && date <= end) {
          dates.push(toDateKey(date));
        }
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  if (!dates.length) {
    dates.push(startDate);
  }

  return uniqueDates(dates);
};

async function storeExternalImage(url, folder) {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const ext = guessExtension(contentType, url);
  const hash = crypto
    .createHash('sha1')
    .update(`${Date.now()}-${url}-${buffer.length}`)
    .digest('hex');
  const filePath = `${folder}/${hash}.${ext}`;

  const bucket = getStorage().bucket();
  const storageFile = bucket.file(filePath);
  const downloadToken = crypto.randomUUID();
  await storageFile.save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}

async function geocodeAddress(address, apiKey) {
  if (!apiKey || !address) return null;
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}` +
    `&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const location = data?.results?.[0]?.geometry?.location;
  return location ? { lat: location.lat, lng: location.lng } : null;
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    if (!type || (type !== 'milonga' && type !== 'festival')) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const db = getFirestore();
    const snapshot = await db
      .collection('event_submissions')
      .where('type', '==', type)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const submissions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ ok: true, submissions });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json();
    const { id, action } = body || {};
    if (!id || !['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getFirestore();
    const doc = await db.collection('event_submissions').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = doc.data();
    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed' }, { status: 400 });
    }

    if (action === 'deny') {
      await db.collection('event_submissions').doc(id).set(
        { status: 'denied', updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return NextResponse.json({ ok: true });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const payload = submission.payload || {};
    const now = new Date().toISOString();

    if (submission.type === 'milonga') {
      const fullAddress = [payload.address, payload.city].filter(Boolean).join(', ');
      const coords = await geocodeAddress(fullAddress, apiKey);
      const imageUrl =
        payload.signedImageUrl && !payload.imageUrl
          ? await storeExternalImage(payload.signedImageUrl, 'milongas/imported')
          : payload.imageUrl || null;

      const recurrenceGroupId = payload.recurrence ? crypto.randomUUID() : null;
      const dates = payload.recurrence
        ? buildRecurrenceDates(payload.date, payload.recurrence)
        : [payload.date || null].filter(Boolean);

      const eventsCollection = db.collection('external_events');
      const writes = dates.map((date, index) =>
        eventsCollection.add({
          source: 'organizer',
          sourceUrl: null,
          status: 'active',
          title: payload.title || null,
          date,
          startTimeMinutes: payload.startTimeMinutes ?? null,
          endTimeMinutes: payload.endTimeMinutes ?? null,
          eventType: payload.eventType || 'milonga',
          venue: payload.venue || null,
          address: payload.address || null,
          city: payload.city || null,
          citySlug: payload.citySlug || slugify(payload.city),
          imageUrl,
          descriptionRaw: payload.descriptionRaw || null,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          submitter: submission.submitter || { uid: null, email: null },
          recurrence: payload.recurrence || null,
          recurrenceGroupId,
          isRecurrenceMaster: recurrenceGroupId ? index === 0 : true,
          createdAt: now,
          updatedAt: now,
        })
      );
      await Promise.all(writes);
    } else {
      const fullAddress = [payload.city, payload.country].filter(Boolean).join(', ');
      const coords = await geocodeAddress(fullAddress, apiKey);
      const imageUrl =
        payload.signedImageUrl && !payload.imageUrl
          ? await storeExternalImage(payload.signedImageUrl, 'festivals/imported')
          : payload.imageUrl || null;

      await db.collection('external_festivals').add({
        source: 'organizer',
        sourceUrl: null,
        status: 'active',
        title: payload.title || null,
        city: payload.city || null,
        country: payload.country || null,
        startDate: payload.startDate || null,
        endDate: payload.endDate || payload.startDate || null,
        dateText: payload.dateText || null,
        website: payload.website || null,
        eventType: payload.eventType || 'festival',
        imageUrl,
        description: payload.description || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        submitter: submission.submitter || { uid: null, email: null },
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.collection('event_submissions').doc(id).set(
      { status: 'approved', updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update submission' },
      { status: 500 }
    );
  }
}
