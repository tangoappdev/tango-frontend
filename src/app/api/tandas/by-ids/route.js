import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';

// Helper to generate signed URLs for media
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const [url] = await getStorage().bucket().file(filePath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    return url;
  } catch (error) {
    console.error(`Failed to sign URL for ${filePath}.`, error);
    return null;
  }
}

export async function POST(request) {
  try {
    const { tandaIds } = await request.json();

    if (!Array.isArray(tandaIds) || tandaIds.length === 0) {
      return NextResponse.json({ tandas: [] });
    }
    
    // Firestore 'in' query is limited to 30 items.
    if (tandaIds.length > 30) {
        return NextResponse.json({ error: 'Too many IDs requested. Maximum is 30.' }, { status: 400 });
    }

    const db = getFirestore();
    const tandasRef = db.collection('tandas');
    const snapshot = await tandasRef.where(admin.firestore.FieldPath.documentId(), 'in', tandaIds).get();

    if (snapshot.empty) {
      return NextResponse.json({ tandas: [] });
    }

    const tandas = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const artwork_signed = await generateV4ReadSignedUrl(data.artwork_url);
      const tracks_signed = await Promise.all(
        (data.tracks || []).map(async (track) => ({
          ...track,
          url_signed: await generateV4ReadSignedUrl(track.url || track.filePath),
        }))
      );

      return {
        id: doc.id,
        ...data,
        artwork_signed,
        tracks_signed,
      };
    }));
    
    // Firestore does not guarantee the order of results in an 'in' query.
    // We must re-order them to match the user's custom list order.
    const orderedTandas = tandaIds.map(id => tandas.find(t => t.id === id)).filter(Boolean);

    return NextResponse.json({ tandas: orderedTandas });

  } catch (error) {
    console.error('Error fetching tandas by IDs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}