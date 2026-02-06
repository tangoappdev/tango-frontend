import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
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

const UPDATABLE_FIELDS = new Set([
  'title',
  'city',
  'country',
  'startDate',
  'endDate',
  'dateText',
  'website',
  'imageUrl',
  'latitude',
  'longitude',
  'topPick',
]);

function guessExtension(contentType, url) {
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  const match = url?.match(/\.(jpg|jpeg|png|webp)(\?|#|$)/i);
  if (match) return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  return 'jpg';
}

async function storeExternalImage(url, folder) {
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

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const db = getFirestore();
    const today = new Date().toISOString().slice(0, 10);
    const snapshot = await db
      .collection('external_festivals')
      .where('endDate', '>=', today)
      .get();

    const festivals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const overrideIds = festivals.map((festival) => festival.id);
    const overridesMap = new Map();
    if (overrideIds.length) {
      const overridesCollection = db.collection('external_festival_overrides');
      const refs = overrideIds.map((id) => overridesCollection.doc(id));
      const overrideDocs = await db.getAll(...refs);
      overrideDocs.forEach((doc) => {
        if (doc.exists) overridesMap.set(doc.id, doc.data());
      });
    }

    const merged = festivals
      .map((festival) => {
        const override = overridesMap.get(festival.id);
        return {
          ...festival,
          ...(override || {}),
          id: festival.id,
        };
      })
      .filter((festival) => !festival.deleted)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    return NextResponse.json({ festivals: merged });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch festivals' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json();
    const { id, updates, deleteFields } = body || {};
    if (!id || (!updates && !deleteFields)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const sanitized = {};
    const signedImageUrl = updates?.signedImageUrl;
    if (updates && typeof updates === 'object') {
      Object.entries(updates).forEach(([key, value]) => {
        if (UPDATABLE_FIELDS.has(key)) {
          if (value === undefined) return;
          sanitized[key] = value === '' ? null : value;
        }
      });
    }

    if (signedImageUrl) {
      const storedUrl = await storeExternalImage(signedImageUrl, 'festivals/imported');
      sanitized.imageUrl = storedUrl;
    }

    const deleteList = Array.isArray(deleteFields)
      ? deleteFields.filter((field) => UPDATABLE_FIELDS.has(field))
      : [];

    if (!Object.keys(sanitized).length && deleteList.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    deleteList.forEach((field) => {
      sanitized[field] = FieldValue.delete();
    });

    const db = getFirestore();
    const hasLocationUpdate =
      Object.prototype.hasOwnProperty.call(sanitized, 'city') ||
      Object.prototype.hasOwnProperty.call(sanitized, 'country');
    const hasLatUpdate =
      Object.prototype.hasOwnProperty.call(sanitized, 'latitude') ||
      Object.prototype.hasOwnProperty.call(sanitized, 'longitude');

    if (hasLocationUpdate && !hasLatUpdate) {
      let baseCity = null;
      let baseCountry = null;
      try {
        const doc = await db.collection('external_festivals').doc(id).get();
        if (doc.exists) {
          const data = doc.data() || {};
          baseCity = data.city || null;
          baseCountry = data.country || null;
        }
      } catch (error) {
        // ignore fetch errors
      }
      const city = Object.prototype.hasOwnProperty.call(sanitized, 'city')
        ? sanitized.city
        : baseCity;
      const country = Object.prototype.hasOwnProperty.call(sanitized, 'country')
        ? sanitized.country
        : baseCountry;
      const apiKey =
        process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const coords = await geocodeCityCountry(city, country, apiKey);
      if (coords) {
        sanitized.latitude = coords.lat;
        sanitized.longitude = coords.lng;
      }
    }

    await db.collection('external_festival_overrides').doc(id).set(sanitized, { merge: true });

    return NextResponse.json({ ok: true, imageUrl: sanitized.imageUrl ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update festival' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json();
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const db = getFirestore();
    await db.collection('external_festival_overrides').doc(id).set({ deleted: true }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete festival' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json();
    const {
      title,
      city,
      country,
      startDate,
      endDate,
      dateText,
      website,
      imageUrl,
      latitude,
      longitude,
    } = body || {};

    if (!title || (!startDate && !dateText)) {
      return NextResponse.json(
        { error: 'Title and start date (or date text) are required.' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const payload = {
      source: 'manual',
      sourceUrl: null,
      title: title || null,
      city: city || null,
      country: country || null,
      startDate: startDate || null,
      endDate: endDate || startDate || null,
      dateText: dateText || null,
      website: website || null,
      imageUrl: imageUrl || null,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (payload.latitude == null || payload.longitude == null) {
      const apiKey =
        process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const coords = await geocodeCityCountry(payload.city, payload.country, apiKey);
      if (coords) {
        payload.latitude = coords.lat;
        payload.longitude = coords.lng;
      }
    }

    const docRef = await db.collection('external_festivals').add(payload);
    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create festival' },
      { status: 500 }
    );
  }
}
