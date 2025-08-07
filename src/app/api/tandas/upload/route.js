import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '../../../../lib/firebaseAdmin'; // We no longer need to import 'admin' from here
import admin from 'firebase-admin'; // Import the main admin object directly
import { v4 as uuidv4 } from 'uuid';

/**
 * A helper function to upload a file buffer to Firebase Cloud Storage.
 * @param {File} file - The file object from the FormData.
 * @param {string} destination - The folder in the bucket (e.g., 'artworks' or 'tracks').
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
async function uploadFile(file, destination) {
  if (!file) return null;

  const bucket = adminStorage.bucket();
  
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  
  const uniqueFilename = `${uuidv4()}-${file.name}`;
  const storageFile = bucket.file(`${destination}/${uniqueFilename}`);

  await storageFile.save(fileBuffer, {
    metadata: {
      contentType: file.type,
    },
  });

  // This call is no longer needed with uniform bucket-level access and public settings
  // await storageFile.makePublic(); 
  
  return storageFile.publicUrl();
}


export async function POST(request) {
  try {
    // TODO: Add an authentication check here later to ensure only you can upload.
    
    const formData = await request.formData();
    
    const orchestra = formData.get('orchestra');
    const singer = formData.get('singer');
    const type = formData.get('type');
    const category = formData.get('category');
    const style = formData.get('style');
    
    const imageFile = formData.get('image');
    const titles = formData.getAll('titles[]');
    const audioFiles = formData.getAll('files[]');

    // --- Step 1: Upload all files to Firebase Storage in parallel ---
    const [artworkPath, ...trackUrls] = await Promise.all([
      uploadFile(imageFile, 'artworks'),
      ...audioFiles.map(file => uploadFile(file, 'tracks'))
    ]);

    // --- Step 2: Prepare the final data object for Firestore ---
    // --- Step 2: Prepare the final data object for Firestore ---
    const tandaData = {
      orchestra,
      singer,
      type,
      category,
      style,
      // Correctly saves to 'artwork_path' in Firestore
      artwork_path: artworkPath, 
      tracks: titles.map((title, index) => ({
        title,
        filePath: `tracks/${audioFiles[index].name}`,
      })),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // --- Step 3: Save the final data to Firestore ---
    const docRef = await adminDb.collection('tandas').add(tandaData);

    console.log('✅ Successfully saved tanda to Firestore with ID:', docRef.id);

    return NextResponse.json({ 
      message: 'Tanda uploaded and saved successfully!',
      tandaId: docRef.id 
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error in upload API:', error);
    return NextResponse.json({ error: 'Failed to upload tanda.' }, { status: 500 });
  }
}