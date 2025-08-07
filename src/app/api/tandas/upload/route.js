import { NextResponse } from 'next/server';
// Import the new functions from our helper
import { getFirestore, getStorage, getServerTimestamp } from '../../../../lib/firebaseAdmin'; 
import { v4 as uuidv4 } from 'uuid';

/**
 * A helper function to upload a file buffer to Firebase Cloud Storage.
 * @param {File} file - The file object from the FormData.
 * @param {string} destination - The folder in the bucket (e.g., 'artworks' or 'tracks').
 * @returns {Promise<{publicUrl: string, filePath: string}>} An object with the public URL and the clean file path.
 */
async function uploadFile(file, destination) {
  if (!file) return { publicUrl: null, filePath: null };

  const bucket = getStorage().bucket(); // Use the getStorage() function
  
  const uniqueFilename = `${uuidv4()}-${file.name}`;
  const filePath = `${destination}/${uniqueFilename}`;
  const storageFile = bucket.file(filePath);

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  
  await storageFile.save(fileBuffer, {
    metadata: {
      contentType: file.type,
    },
  });
  
  const publicUrl = storageFile.publicUrl();

  return { publicUrl, filePath };
}


export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const orchestra = formData.get('orchestra');
    const singer = formData.get('singer');
    const type = formData.get('type');
    const category = formData.get('category');
    const style = formData.get('style');
    
    const imageFile = formData.get('image');
    const titles = formData.getAll('titles[]');
    const audioFiles = formData.getAll('files[]');

    const [artworkResult, ...trackResults] = await Promise.all([
      uploadFile(imageFile, 'artworks'),
      ...audioFiles.map(file => uploadFile(file, 'tracks'))
    ]);

    const tandaData = {
      orchestra,
      singer,
      type,
      category,
      style,
      artwork_url: artworkResult.filePath, 
      tracks: titles.map((title, index) => ({
        title,
        url: trackResults[index].filePath,
      })),
      createdAt: getServerTimestamp(), // Use the getServerTimestamp() function
    };

    const adminDb = getFirestore(); // Use the getFirestore() function
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