import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';

// --- Helper Function to generate signed URLs ---
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) {
    return null;
  }
  try {
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    };
    const [url] = await getStorage().bucket().file(filePath).getSignedUrl(options);
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

export async function GET() {
  try {
    const db = getFirestore();
    const tandasRef = db.collection('tandas');
    const snapshot = await tandasRef.get();

    if (snapshot.empty) {
      return NextResponse.json({ tracks: [] });
    }

    let allTracks = [];
    snapshot.docs.forEach(doc => {
      const tandaData = doc.data();
      const tandaId = doc.id;

      if (tandaData.tracks && Array.isArray(tandaData.tracks)) {
        tandaData.tracks.forEach((track, index) => {
          const filePath = track.url || track.filePath;
          // --- UPDATED: Extract file format from the path ---
          const fileFormat = filePath?.split('.').pop().toUpperCase() || 'N/A';

          allTracks.push({
            uniqueId: `${tandaId}-${index}`, 
            tandaId: tandaId,
            orchestra: tandaData.orchestra,
            title: track.title,
            url: filePath,
            // --- NEW: Add extra data from the parent tanda ---
            type: tandaData.type,
            style: tandaData.style || null,
            format: fileFormat,
            // Duration is complex and will be added later
            duration: null 
          });
        });
      }
    });

    const tracksWithSignedUrls = await Promise.all(
      allTracks.map(async (track) => {
        const signedUrl = await generateV4ReadSignedUrl(track.url);
        return {
          ...track,
          playableUrl: signedUrl,
        };
      })
    );

    return NextResponse.json({ tracks: tracksWithSignedUrls });

  } catch (error) {
    console.error('Error fetching all tracks:', error);
    return NextResponse.json({ message: 'Failed to fetch tracks.', error: error.message }, { status: 500 });
  }
}
