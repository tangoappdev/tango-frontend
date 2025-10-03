// ANCHOR: api-cortinas-player (REPLACE WHOLE FILE)
// src/app/api/cortinas/player/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const SIGNED_URL_EXPIRATION_MINUTES = 60;

function sanitizeFadeValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

// --- Helpers ---
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const [url] = await getStorage()
      .bucket()
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + SIGNED_URL_EXPIRATION_MINUTES * 60 * 1000, // 60 min
      });
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

// --- Route ---
export async function GET(request) {
  // NOTE: Player should work when signed out.
  // We keep this call ONLY to support future pro/free logic, but we do not block if absent.
  // ANCHOR: optional-auth
  const user = await getUserFromRequest(request).catch(() => null);
  // (user may be null for signed-out visitors)

  try {
    const db = getFirestore();
    const snapshot = await db.collection('cortinas').get();

    const settingsDoc = await db.collection('appSettings').doc('cortinaFade').get();
    const rawSettings = settingsDoc.exists ? settingsDoc.data() || {} : {};
    const fadeSettings = {
      fadeInSeconds: sanitizeFadeValue(rawSettings.fadeInSeconds),
      fadeOutSeconds: sanitizeFadeValue(rawSettings.fadeOutSeconds),
    };

    if (snapshot.empty) {
      // ANCHOR: empty-result
      return NextResponse.json({ cortinas: [], settings: fadeSettings });
    }

    // Public fallback artwork (host this in /public or change as needed)
    const defaultArtworkUrl = '/cortina-artwork.jpg';

    // ANCHOR: map-cortinas
    const cortinas = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const filePath = data.url || data.filePath; // support either field name
        const playableUrl = await generateV4ReadSignedUrl(filePath);

        // If you later store artwork paths in Firestore (e.g., data.artworkPath),
        // you can sign that too; for now we return a public placeholder.
        const startTimeRaw = Number(data.startTime);
        const endTimeRaw = Number(data.endTime);
        const startTime = Number.isFinite(startTimeRaw) && startTimeRaw >= 0 ? startTimeRaw : 0;
        const endTime = Number.isFinite(endTimeRaw) && endTimeRaw > startTime ? endTimeRaw : null;

        return {
          id: doc.id,
          ...data,
          startTime,
          endTime,
          playableUrl,
          artwork_url_signed: defaultArtworkUrl,
        };
      })
    );

    // ANCHOR: success-response
    // Small private cache to reduce churn while avoiding long-lived signed URLs in caches.
    return new NextResponse(JSON.stringify({ cortinas, settings: fadeSettings }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error fetching cortinas for player:', error);
    return NextResponse.json(
      { message: 'Failed to fetch cortinas.', error: error.message },
      { status: 500 }
    );
  }
}
// ANCHOR: api-cortinas-player (END)


