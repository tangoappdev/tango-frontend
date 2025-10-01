import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const DEFAULT_ARTWORK = '/cortina-artwork.jpg';

async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const [url] = await getStorage()
      .bucket()
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000,
      });
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { cortinaIds } = await request.json();
    if (!Array.isArray(cortinaIds) || cortinaIds.length === 0) {
      return NextResponse.json({ cortinas: [] });
    }

    if (cortinaIds.length > 30) {
      return NextResponse.json({ error: 'Too many IDs requested. Maximum is 30.' }, { status: 400 });
    }

    const db = getFirestore();
    const snapshot = await db
      .collection('cortinas')
      .where(admin.firestore.FieldPath.documentId(), 'in', cortinaIds)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ cortinas: [] });
    }

    const cortinas = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const playableSource = data.playableUrl || data.url_signed || data.url || data.filePath || null;
        const artworkSource = data.artwork_url || data.artworkPath || null;
        const playableUrl = await generateV4ReadSignedUrl(playableSource);
        const artworkUrlSigned = artworkSource
          ? await generateV4ReadSignedUrl(artworkSource)
          : DEFAULT_ARTWORK;

        return {
          id: doc.id,
          ...data,
          playableUrl,
          artwork_url_signed: artworkUrlSigned,
        };
      })
    );

    const ordered = cortinaIds
      .map((id) => cortinas.find((item) => item.id === id))
      .filter(Boolean);

    return NextResponse.json({ cortinas: ordered });
  } catch (error) {
    console.error('Error fetching cortinas by IDs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

