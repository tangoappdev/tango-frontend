// src/app/api/tandas/manage/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const db = getFirestore();
const storage = getStorage();

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

// Fetch all tandas for the management page (ADMIN ONLY)
export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const tandasRef = db.collection('tandas');
    const snapshot = await tandasRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return NextResponse.json({ tandas: [] }, { status: 200 });
    }

    const tandas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ tandas });
  } catch (error) {
    console.error('Error fetching tandas for management:', error);
    return NextResponse.json(
      { message: 'Failed to fetch tandas.', error: error.message },
      { status: 500 }
    );
  }
}

// Delete a tanda and its associated files (ADMIN ONLY)
export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { searchParams } = new URL(request.url);
    const tandaId = searchParams.get('id');

    if (!tandaId) {
      return NextResponse.json({ message: 'Tanda ID is required.' }, { status: 400 });
    }

    const tandaRef = db.collection('tandas').doc(tandaId);
    const tandaDoc = await tandaRef.get();

    if (!tandaDoc.exists) {
      return NextResponse.json({ message: 'Tanda not found.' }, { status: 404 });
    }

    const tandaData = tandaDoc.data();
    const filePathsToDelete = [];

    // artwork
    if (tandaData.artwork_url) {
      filePathsToDelete.push(tandaData.artwork_url);
    }

    // tracks
    if (tandaData.tracks && Array.isArray(tandaData.tracks)) {
      tandaData.tracks.forEach(track => {
        const path = track.url || track.filePath;
        if (path) filePathsToDelete.push(path);
      });
    }

    // delete files
    if (filePathsToDelete.length > 0) {
      await Promise.all(
        filePathsToDelete.map(filePath =>
          storage
            .bucket()
            .file(filePath)
            .delete()
            .catch(err =>
              console.error(`Failed to delete file ${filePath}, it may not exist.`, err.message)
            )
        )
      );
    }

    // delete Firestore doc
    await tandaRef.delete();

    return NextResponse.json(
      { message: `Tanda ${tandaId} deleted successfully.` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting tanda:', error);
    return NextResponse.json(
      { message: 'Failed to delete tanda.', error: error.message },
      { status: 500 }
    );
  }
}
