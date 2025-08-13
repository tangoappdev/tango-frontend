import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';

// Helper function to generate a secure, temporary URL to read a file
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) {
    return null;
  }
  try {
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minute expiry
    };
    const [url] = await getStorage().bucket().file(filePath).getSignedUrl(options);
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

// This API route fetches all cortinas for the main music player.
export async function GET() {
  try {
    const db = getFirestore();
    const cortinasRef = db.collection('cortinas');
    const snapshot = await cortinasRef.get();

    if (snapshot.empty) {
      return NextResponse.json({ cortinas: [] });
    }

    // --- THIS IS THE FIX: Use the direct public path for the default artwork ---
    const defaultArtworkUrl = '/cortina-artwork.jpg';

    // Map over the documents and generate a playable URL for each one
    const cortinas = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const playableUrl = await generateV4ReadSignedUrl(data.url);
      return {
        id: doc.id,
        ...data,
        playableUrl: playableUrl,
        artwork_url_signed: defaultArtworkUrl,
      };
    }));

    return NextResponse.json({ cortinas });

  } catch (error) {
    console.error('Error fetching cortinas for player:', error);
    return NextResponse.json({ message: 'Failed to fetch cortinas.', error: error.message }, { status: 500 });
  }
}
