import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';

const db = getFirestore();
const storage = getStorage();

// --- NEW HELPER FUNCTION ---
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) {
    return null;
  }
  try {
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour expiry
    };
    const [url] = await storage.bucket().file(filePath).getSignedUrl(options);
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

// This function fetches all cortinas for the management page.
export async function GET() {
  try {
    const cortinasRef = db.collection('cortinas');
    const snapshot = await cortinasRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return NextResponse.json({ cortinas: [] });
    }

    // --- UPDATED: Now generates a playable URL for each cortina ---
    const cortinas = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const playableUrl = await generateV4ReadSignedUrl(data.url);
      return {
        id: doc.id,
        ...data,
        playableUrl: playableUrl,
      };
    }));

    return NextResponse.json({ cortinas });

  } catch (error) {
    console.error('Error fetching cortinas:', error);
    return NextResponse.json({ message: 'Failed to fetch cortinas.', error: error.message }, { status: 500 });
  }
}

// This function handles deleting a cortina and its audio file.
export async function DELETE(request) {
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
    const filePath = cortinaData.url;

    // Delete the audio file from Cloud Storage
    if (filePath) {
      await storage.bucket().file(filePath).delete().catch(err => {
        console.error(`Failed to delete file ${filePath}, it may not exist.`, err.message);
      });
    }

    // Delete the document from Firestore
    await cortinaRef.delete();

    return NextResponse.json({ message: 'Cortina deleted successfully.' });

  } catch (error) {
    console.error('Error deleting cortina:', error);
    return NextResponse.json({ message: 'Failed to delete cortina.', error: error.message }, { status: 500 });
  }
}
