// src/app/api/tracks/manage/[trackId]/route.js
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

// Update a single track's title within a tanda (ADMIN ONLY)
export async function PUT(request, { params }) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    // The trackId from the URL is a combination of "tandaId-trackIndex"
    const { trackId } = params; 
    const { newTitle } = await request.json();

    if (!trackId || !newTitle) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    
    // Split the uniqueId back into its parts
    const [tandaId, trackIndexStr] = trackId.split('-');
    const trackIndex = parseInt(trackIndexStr, 10);

    const db = getFirestore();
    const tandaRef = db.collection('tandas').doc(tandaId);
    const doc = await tandaRef.get();

    if (!doc.exists) {
      return NextResponse.json({ message: 'Tanda not found.' }, { status: 404 });
    }

    const tandaData = doc.data();
    const tracks = Array.isArray(tandaData.tracks) ? tandaData.tracks : [];

    if (isNaN(trackIndex) || trackIndex < 0 || trackIndex >= tracks.length) {
        return NextResponse.json({ message: 'Invalid track index.' }, { status: 400 });
    }
    
    tracks[trackIndex].title = newTitle;

    await tandaRef.update({ tracks });

    return NextResponse.json({ message: 'Track title updated successfully.' });

  } catch (error) {
    console.error('Error updating track title:', error);
    return NextResponse.json({ message: 'Failed to update track title.', error: error.message }, { status: 500 });
  }
}

// Delete a single track and its file (ADMIN ONLY)
export async function DELETE(request, { params }) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { trackId } = params;
    if (!trackId) {
      return NextResponse.json({ message: 'Track ID is required.' }, { status: 400 });
    }

    const [tandaId, trackIndexStr] = trackId.split('-');
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

    // 1. Get the file path of the track to delete.
    const trackToDelete = tracks[trackIndex];
    const filePath = trackToDelete.url || trackToDelete.filePath;

    // 2. Delete the file from Cloud Storage if the path exists.
    if (filePath) {
      await storage.bucket().file(filePath).delete().catch(err => {
        console.error(`Failed to delete file ${filePath}, it may not exist.`, err.message);
      });
    }

    // 3. Remove the track from the array.
    const updatedTracks = tracks.filter((_, index) => index !== trackIndex);

    // 4. Save the updated tracks array back to Firestore.
    await tandaRef.update({ tracks: updatedTracks });

    return NextResponse.json({ message: 'Track deleted successfully.' });

  } catch (error) {
    console.error('Error deleting track:', error);
    return NextResponse.json({ message: 'Failed to delete track.', error: error.message }, { status: 500 });
  }
}
