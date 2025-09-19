// src/app/api/tracks/orphans/route.js
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

// Find audio and artwork files in Storage that are not referenced in Firestore (ADMIN ONLY)
export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const db = getFirestore();
    const storage = getStorage();

    // 1) Collect all file paths referenced in Firestore
    const tandasSnapshot = await db.collection('tandas').get();
    const databaseFiles = new Set();
    tandasSnapshot.forEach(doc => {
      const tanda = doc.data();
      if (tanda?.artwork_url) {
        databaseFiles.add(tanda.artwork_url);
      }
      if (Array.isArray(tanda?.tracks)) {
        tanda.tracks.forEach(track => {
          const path = track?.url || track?.filePath;
          if (path) databaseFiles.add(path);
        });
      }
    });

    // 2) List files in Storage under 'tracks/' and 'artwork/'
    const [trackFiles] = await storage.bucket().getFiles({ prefix: 'tracks/' });
    const [artworkFiles] = await storage.bucket().getFiles({ prefix: 'artwork/' });
    const storageFilePaths = [...trackFiles, ...artworkFiles].map(f => f.name);

    // 3) Orphans = present in Storage but not referenced in Firestore
    const orphanedFiles = storageFilePaths.filter((filePath) => {
      if (filePath.endsWith('/')) return false; // ignore directory placeholders
      return !databaseFiles.has(filePath);
    });

    return NextResponse.json({ orphanedFiles });
  } catch (error) {
    console.error('Error finding orphaned files:', error);
    return NextResponse.json(
      { message: 'Failed to find orphaned files.', error: error.message },
      { status: 500 }
    );
  }
}

// Delete orphaned files (ADMIN ONLY)
export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { filePaths } = await request.json();

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json({ message: 'File paths are required.' }, { status: 400 });
    }

    const storage = getStorage();
    const bucket = storage.bucket();

    await Promise.all(
      filePaths.map((filePath) =>
        bucket
          .file(filePath)
          .delete()
          .catch((err) => {
            console.error(`Failed to delete ${filePath}, it may have already been removed.`, err.message);
          })
      )
    );

    return NextResponse.json({ message: 'Orphaned files deleted successfully.' });
  } catch (error) {
    console.error('Error deleting orphaned files:', error);
    return NextResponse.json(
      { message: 'Failed to delete orphaned files.', error: error.message },
      { status: 500 }
    );
  }
}
