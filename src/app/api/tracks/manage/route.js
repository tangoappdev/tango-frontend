// src/app/api/tracks/manage/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
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

// --- Helper Function to generate signed URLs ---
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
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

export async function GET(request) {
  // Admin gate
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

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
          const fileFormat = filePath?.split('.').pop()?.toUpperCase() || 'N/A';

          allTracks.push({
            uniqueId: `${tandaId}-${index}`,
            tandaId,
            orchestra: tandaData.orchestra,
            title: track.title,
            url: filePath,
            type: tandaData.type,
            style: tandaData.style || null,
            format: fileFormat,
            duration: null, // TODO: add later
          });
        });
      }
    });

    const tracksWithSignedUrls = await Promise.all(
      allTracks.map(async (track) => {
        const signedUrl = await generateV4ReadSignedUrl(track.url);
        return { ...track, playableUrl: signedUrl };
      })
    );

    return NextResponse.json({ tracks: tracksWithSignedUrls });
  } catch (error) {
    console.error('Error fetching all tracks:', error);
    return NextResponse.json(
      { message: 'Failed to fetch tracks.', error: error.message },
      { status: 500 }
    );
  }
}
