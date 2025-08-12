import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';

const db = getFirestore();
const storage = getStorage();

// This function fetches all tandas for the management page.
export async function GET() {
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
    return NextResponse.json({ message: 'Failed to fetch tandas.', error: error.message }, { status: 500 });
  }
}

// This function handles deleting a tanda and its associated files.
export async function DELETE(request) {
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

    // Collect the artwork file path if it exists
    if (tandaData.artwork_url) {
      filePathsToDelete.push(tandaData.artwork_url);
    }

    // Collect all track file paths
    if (tandaData.tracks && Array.isArray(tandaData.tracks)) {
      tandaData.tracks.forEach(track => {
        // --- THIS IS THE FIX ---
        // Check for either 'url' or 'filePath' to be safe.
        const path = track.url || track.filePath; 
        if (path) {
          filePathsToDelete.push(path);
        }
      });
    }

    // Delete all collected files from Firebase Storage
    if (filePathsToDelete.length > 0) {
      await Promise.all(
        filePathsToDelete.map(filePath => {
          console.log(`Attempting to delete file: ${filePath}`);
          return storage.bucket().file(filePath).delete().catch(err => {
            // Log errors but don't stop the process if a file is already gone
            console.error(`Failed to delete file ${filePath}, it may not exist.`, err.message);
          });
        })
      );
    }

    // Finally, delete the tanda document from Firestore
    await tandaRef.delete();

    return NextResponse.json({ message: `Tanda ${tandaId} deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error('Error deleting tanda:', error);
    return NextResponse.json({ message: 'Failed to delete tanda.', error: error.message }, { status: 500 });
  }
}
