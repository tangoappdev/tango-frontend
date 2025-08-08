import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// --- Firebase Initialization ---
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'tangoapp-8bd65-storage' 
    });
  } catch (error)
{
    console.error('Firebase initialization error:', error.message);
  }
}

const bucket = admin.storage().bucket();

/**
 * API Route to generate secure, temporary URLs for direct file uploads.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { imageName, trackNames } = body;

    if (!trackNames || !Array.isArray(trackNames)) {
      return NextResponse.json({ error: 'Invalid file information provided.' }, { status: 400 });
    }

    const expiration = Date.now() + 15 * 60 * 1000;
    const options = {
      version: 'v4',
      action: 'write',
      expires: expiration,
    };

    let imageUploadInfo = null;
    if (imageName) {
      const uniqueImageName = `${uuidv4()}-${imageName}`;
      // --- FIX: Corrected folder name from "artworks" to "artwork" ---
      const imagePath = `artwork/${uniqueImageName}`;
      const [url] = await bucket.file(imagePath).getSignedUrl(options);
      imageUploadInfo = { url, path: imagePath };
    }

    const trackUploadInfos = await Promise.all(
      trackNames.map(async (trackName) => {
        const uniqueTrackName = `${uuidv4()}-${trackName}`;
        const trackPath = `tracks/${uniqueTrackName}`;
        const [url] = await bucket.file(trackPath).getSignedUrl(options);
        return { url, path: trackPath, originalName: trackName };
      })
    );

    return NextResponse.json({ imageUploadInfo, trackUploadInfos }, { status: 200 });

  } catch (error) {
    console.error('Error generating signed URLs:', error);
    return NextResponse.json({ error: 'Failed to generate upload URLs.' }, { status: 500 });
  }
}
