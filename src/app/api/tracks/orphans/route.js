import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';

// This API finds audio and artwork files in Storage that are not referenced in Firestore.
export async function GET() {
  try {
    const db = getFirestore();
    const storage = getStorage();

    // 1. Get all track and artwork file paths from Firestore
    const tandasSnapshot = await db.collection('tandas').get();
    const databaseFiles = new Set();
    tandasSnapshot.forEach(doc => {
      const tanda = doc.data();
      // Add artwork URL
      if (tanda.artwork_url) {
        databaseFiles.add(tanda.artwork_url);
      }
      // Add track URLs
      if (tanda.tracks && Array.isArray(tanda.tracks)) {
        tanda.tracks.forEach(track => {
          const path = track.url || track.filePath;
          if (path) {
            databaseFiles.add(path);
          }
        });
      }
    });

    // 2. Get all files from both 'tracks/' and 'artwork/' directories
    const [trackFiles] = await storage.bucket().getFiles({ prefix: 'tracks/' });
    const [artworkFiles] = await storage.bucket().getFiles({ prefix: 'artwork/' });
    
    const allStorageFiles = [...trackFiles, ...artworkFiles];
    const storageFilePaths = allStorageFiles.map(file => file.name);

    // 3. Compare the two lists to find the orphans
    const orphanedFiles = storageFilePaths.filter(filePath => {
      // Ignore the folders themselves if they appear in the list
      if (filePath.endsWith('/')) {
        return false;
      }
      return !databaseFiles.has(filePath);
    });

    return NextResponse.json({ orphanedFiles });

  } catch (error) {
    console.error('Error finding orphaned files:', error);
    return NextResponse.json({ message: 'Failed to find orphaned files.', error: error.message }, { status: 500 });
  }
}


// This function handles deleting orphaned files
export async function DELETE(request) {
    try {
        const { filePaths } = await request.json();

        if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
            return NextResponse.json({ message: 'File paths are required.' }, { status: 400 });
        }

        const storage = getStorage();
        const bucket = storage.bucket();

        const deletePromises = filePaths.map(filePath => {
            console.log(`Deleting orphaned file: ${filePath}`);
            return bucket.file(filePath).delete().catch(err => {
                console.error(`Failed to delete ${filePath}, it may have already been removed.`, err.message);
            });
        });

        await Promise.all(deletePromises);

        return NextResponse.json({ message: 'Orphaned files deleted successfully.' });

    } catch (error) {
        console.error('Error deleting orphaned files:', error);
        return NextResponse.json({ message: 'Failed to delete orphaned files.', error: error.message }, { status: 500 });
    }
}
