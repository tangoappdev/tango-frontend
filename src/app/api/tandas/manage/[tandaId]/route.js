import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { v4 as uuidv4 } from 'uuid';

// --- Helper Functions ---
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const options = { version: 'v4', action: 'read', expires: Date.now() + 15 * 60 * 1000 };
    const [url] = await getStorage().bucket().file(filePath).getSignedUrl(options);
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

// --- NEW HELPER: Generates a write URL for file uploads ---
async function generateV4WriteSignedUrl(filePath) {
    if(!filePath) return null;
    try {
        const options = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: 'application/octet-stream' // Generic content type
        };
        const [url] = await getStorage().bucket().file(filePath).getSignedUrl(options);
        return url;
    } catch (error) {
        console.error(`Failed to generate write URL for ${filePath}`, error);
        return null;
    }
}


export async function GET(request, { params }) {
  const { tandaId } = params;
  try {
    if (!tandaId) {
      return NextResponse.json({ message: 'Tanda ID is required.' }, { status: 400 });
    }
    const db = getFirestore();
    const tandaRef = db.collection('tandas').doc(tandaId);
    const doc = await tandaRef.get();
    if (!doc.exists) {
      return NextResponse.json({ message: 'Tanda not found.' }, { status: 404 });
    }
    const tandaData = doc.data();
    const signedArtworkUrl = await generateV4ReadSignedUrl(tandaData.artwork_url);
    const responseData = {
      id: doc.id,
      ...tandaData,
      artwork_url_signed: signedArtworkUrl 
    };
    return NextResponse.json({ tanda: responseData });
  } catch (error) {
    console.error(`Error fetching tanda ${tandaId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch tanda.', error: error.message }, { status: 500 });
  }
}


// --- NEW FUNCTION to handle updates ---
export async function PUT(request, { params }) {
    const { tandaId } = params;
    try {
        const db = getFirestore();
        const storage = getStorage();
        const tandaRef = db.collection('tandas').doc(tandaId);
        const body = await request.json();
        const { filesToUpload, fieldsToUpdate, filesToDelete } = body;

        // 1. Delete any files that were replaced or removed.
        if (filesToDelete && filesToDelete.length > 0) {
            await Promise.all(filesToDelete.map(filePath => {
                if (filePath) {
                    return storage.bucket().file(filePath).delete().catch(err => console.error(`Failed to delete old file: ${filePath}`, err.message));
                }
            }));
        }

        // 2. Generate signed URLs for the new files that need to be uploaded.
        const uploadUrls = {};
        if (filesToUpload && Object.keys(filesToUpload).length > 0) {
            for (const key in filesToUpload) {
                const newPath = filesToUpload[key];
                uploadUrls[key] = await generateV4WriteSignedUrl(newPath);
            }
        }

        // 3. Update the Firestore document with the new text fields and file paths.
        await tandaRef.update(fieldsToUpdate);

        // 4. Send back the signed URLs so the client can upload the new files.
        return NextResponse.json({
            message: 'Update initiated. Please upload new files.',
            uploadUrls: uploadUrls
        });

    } catch (error) {
        console.error(`Error updating tanda ${tandaId}:`, error);
        return NextResponse.json({ message: 'Failed to update tanda.', error: error.message }, { status: 500 });
    }
}
