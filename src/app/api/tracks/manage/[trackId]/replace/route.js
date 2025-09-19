// src/app/api/tracks/manage/[trackId]/replace/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { v4 as uuidv4 } from 'uuid';
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

// Helper: generate a secure v4 URL for direct upload (15 minutes)
async function generateV4WriteSignedUrl(filePath) {
  try {
    const [url] = await getStorage()
      .bucket()
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: 'application/octet-stream',
      });
    return url;
  } catch (error) {
    console.error(`Failed to generate write URL for ${filePath}`, error);
    return null;
  }
}

// Replace a single track file (ADMIN ONLY)
export async function POST(request, { params }) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { trackId } = params;
    const { newFileName } = await request.json();

    if (!trackId || !newFileName) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // trackId format: "<tandaId>-<trackIndex>"
    const [tandaId, trackIndexStr] = String(trackId).split('-');
    const trackIndex = parseInt(trackIndexStr, 10);

    const db = getFirestore();
    const storage = getStorage();
    const tandaRef = db.collection('tandas').doc(tandaId);
    const doc = await tandaRef.get();

    if (!doc.exists) {
      return NextResponse.json({ message: 'Parent tanda not found.' }, { status: 404 });
    }

    const tandaData = doc.data();
    const tracks = Array.isArray(tandaData.tracks) ? tandaData.tracks : [];

    if (isNaN(trackIndex) || trackIndex < 0 || trackIndex >= tracks.length) {
      return NextResponse.json({ message: 'Invalid track index.' }, { status: 400 });
    }

    // 1) Delete old file (best-effort)
    const oldTrack = tracks[trackIndex];
    const oldFilePath = oldTrack.url || oldTrack.filePath;
    if (oldFilePath) {
      await storage
        .bucket()
        .file(oldFilePath)
        .delete()
        .catch(err => {
          console.error(`Old file ${oldFilePath} not found, continuing...`, err.message);
        });
    }

    // 2) Create a new path and update Firestore
    const newFilePath = `tracks/${uuidv4()}-${newFileName}`;
    tracks[trackIndex] = {
      ...oldTrack,
      url: newFilePath,
      // Update format if present or backfill it
      format: (newFileName.split('.').pop() || '').toUpperCase() || oldTrack.format || null,
    };
    await tandaRef.update({ tracks });

    // 3) Generate a signed WRITE URL for client upload
    const uploadUrl = await generateV4WriteSignedUrl(newFilePath);
    if (!uploadUrl) {
      return NextResponse.json({ message: 'Could not generate upload URL.' }, { status: 500 });
    }

    return NextResponse.json({ uploadUrl, newFilePath });
  } catch (error) {
    console.error('Error replacing track file:', error);
    return NextResponse.json(
      { message: 'Failed to replace track file.', error: error.message },
      { status: 500 }
    );
  }
}
