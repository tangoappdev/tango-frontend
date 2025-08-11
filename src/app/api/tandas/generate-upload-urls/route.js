import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
// ADD this new import from your server file
import { getStorage } from '@/lib/firebaseAdmin.server.js';

// --- The initialization block is now completely gone ---

// Use the new function to get your storage instance
const bucket = getStorage().bucket();

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
