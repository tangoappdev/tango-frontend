// src/app/api/tandas/generate-upload-urls/route.js
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getStorage } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

// ---------- Admin guard ----------
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
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

// Use the server-initialized bucket
const bucket = getStorage().bucket();

// Generate secure, temporary v4 URLs for direct file uploads (ADMIN ONLY)
export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json();
    const imageName = body?.imageName || null;
    const trackNames = Array.isArray(body?.trackNames) ? body.trackNames : null;

    if (!trackNames) {
      return NextResponse.json({ error: 'Invalid file information provided.' }, { status: 400 });
    }

    // 15-minute write URLs
    const expires = Date.now() + 15 * 60 * 1000;
    const baseOptions = {
      version: 'v4',
      action: 'write',
      expires,
      contentType: 'application/octet-stream', // generic, lets client set Content-Type on upload
    };

    let imageUploadInfo = null;
    if (imageName) {
      const uniqueImageName = `${uuidv4()}-${imageName}`;
      const imagePath = `artwork/${uniqueImageName}`;
      const [url] = await bucket.file(imagePath).getSignedUrl(baseOptions);
      imageUploadInfo = { url, path: imagePath };
    }

    const trackUploadInfos = await Promise.all(
      trackNames.map(async (trackName) => {
        const uniqueTrackName = `${uuidv4()}-${trackName}`;
        const trackPath = `tracks/${uniqueTrackName}`;
        const [url] = await bucket.file(trackPath).getSignedUrl(baseOptions);
        return { url, path: trackPath, originalName: trackName };
      })
    );

    return NextResponse.json({ imageUploadInfo, trackUploadInfos }, { status: 200 });
  } catch (error) {
    console.error('Error generating signed URLs:', error);
    return NextResponse.json({ error: 'Failed to generate upload URLs.' }, { status: 500 });
  }
}
