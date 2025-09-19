// src/app/api/cortinas/manage/route.js
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

// --- Helper: signed READ URL (1 hour) ---
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const [url] = await storage.bucket().file(filePath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

// Fetch all cortinas for the management page (ADMIN ONLY)
export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const cortinasRef = db.collection('cortinas');
    const snapshot = await cortinasRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return NextResponse.json({ cortinas: [] });
    }

    const cortinas = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const filePath = data.url || data.filePath;
        const playableUrl = await generateV4ReadSignedUrl(filePath);
        return { id: doc.id, ...data, playableUrl };
      })
    );

    return NextResponse.json({ cortinas });
  } catch (error) {
    console.error('Error fetching cortinas:', error);
    return NextResponse.json(
      { message: 'Failed to fetch cortinas.', error: error.message },
      { status: 500 }
    );
  }
}

// Delete a cortina and its audio file (ADMIN ONLY)
export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { searchParams } = new URL(request.url);
    const cortinaId = searchParams.get('id');

    if (!cortinaId) {
      return NextResponse.json({ message: 'Cortina ID is required.' }, { status: 400 });
    }

    const cortinaRef = db.collection('cortinas').doc(cortinaId);
    const doc = await cortinaRef.get();

    if (!doc.exists) {
      return NextResponse.json({ message: 'Cortina not found.' }, { status: 404 });
    }

    const cortinaData = doc.data();
    const filePath = cortinaData.url || cortinaData.filePath;

    // Delete the audio file from Cloud Storage (best-effort)
    if (filePath) {
      await storage
        .bucket()
        .file(filePath)
        .delete()
        .catch((err) => {
          console.error(`Failed to delete file ${filePath}, it may not exist.`, err.message);
        });
    }

    // Delete the document from Firestore
    await cortinaRef.delete();

    return NextResponse.json({ message: 'Cortina deleted successfully.' });
  } catch (error) {
    console.error('Error deleting cortina:', error);
    return NextResponse.json(
      { message: 'Failed to delete cortina.', error: error.message },
      { status: 500 }
    );
  }
}
