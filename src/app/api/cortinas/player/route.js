// src/app/api/cortinas/player/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const SIGNED_URL_EXPIRATION_MINUTES = 60;

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
  // Require auth (free, trial, and pro all allowed)
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getFirestore();
    const snapshot = await db.collection('cortinas').get();

    if (snapshot.empty) {
      return NextResponse.json({ cortinas: [] });
    }

    // Use public default artwork for cortinas
    const defaultArtworkUrl = '/cortina-artwork.jpg';

    const cortinas = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const filePath = data.url || data.filePath; // support either field
        const playableUrl = await generateV4ReadSignedUrl(filePath);

        return {
          id: doc.id,
          ...data,
          playableUrl,
          artwork_url_signed: defaultArtworkUrl,
        };
      })
    );

    return NextResponse.json({ cortinas });
  } catch (error) {
    console.error('Error fetching cortinas for player:', error);
    return NextResponse.json(
      { message: 'Failed to fetch cortinas.', error: error.message },
      { status: 500 }
    );
  }
}
