// src/app/api/tandas/manage/[tandaId]/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

// -------- Admin guard helpers --------
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(decodedUser) {
  // allow either a custom claim "admin": true OR an allowlisted email
  const email = (decodedUser?.email || '').toLowerCase();
  return decodedUser?.admin === true || ADMIN_EMAILS.includes(email);
}

async function requireAdmin(request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isAdmin(user)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

// -------- Signed URL helpers --------
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const options = { version: 'v4', action: 'read', expires: Date.now() + 60 * 60 * 1000 };
    const [url] = await getStorage().bucket().file(filePath).getSignedUrl(options);
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

// Write URL for direct uploads (admin-only)
async function generateV4WriteSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const options = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'application/octet-stream',
    };
    const [url] = await getStorage().bucket().file(filePath).getSignedUrl(options);
    return url;
  } catch (error) {
    console.error(`Failed to generate write URL for ${filePath}`, error);
    return null;
  }
}

// -------- Handlers --------
export async function GET(request, { params }) {
  // Admin gate
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

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
      artwork_url_signed: signedArtworkUrl,
    };

    return NextResponse.json({ tanda: responseData });
  } catch (error) {
    console.error(`Error fetching tanda ${tandaId}:`, error);
    return NextResponse.json(
      { message: 'Failed to fetch tanda.', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  // Admin gate
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  const { tandaId } = params;
  try {
    if (!tandaId) {
      return NextResponse.json({ message: 'Tanda ID is required.' }, { status: 400 });
    }

    const db = getFirestore();
    const storage = getStorage();
    const tandaRef = db.collection('tandas').doc(tandaId);

    const body = await request.json();
    const {
      filesToUpload = {},   // { key: 'bucket/path.ext', ... }
      fieldsToUpdate = {},  // plain object of fields you allow updating
      filesToDelete = [],   // ['bucket/path.ext', ...]
    } = body || {};

    // 1) Delete any files that were replaced or removed.
    if (Array.isArray(filesToDelete) && filesToDelete.length > 0) {
      await Promise.all(
        filesToDelete.map(filePath => {
          if (!filePath) return;
          return storage
            .bucket()
            .file(filePath)
            .delete()
            .catch(err =>
              console.error(`Failed to delete old file: ${filePath}`, err.message)
            );
        })
      );
    }

    // 2) Generate signed write URLs for new files to upload.
    const uploadUrls = {};
    if (filesToUpload && typeof filesToUpload === 'object') {
      for (const key of Object.keys(filesToUpload)) {
        const newPath = filesToUpload[key];
        uploadUrls[key] = await generateV4WriteSignedUrl(newPath);
      }
    }

    // 3) Update Firestore with the new fields/paths.
    if (fieldsToUpdate && typeof fieldsToUpdate === 'object' && Object.keys(fieldsToUpdate).length) {
      await tandaRef.update(fieldsToUpdate);
    }

    // 4) Return the write URLs so the client can upload.
    return NextResponse.json({
      message: 'Update initiated. Please upload new files.',
      uploadUrls,
    });
  } catch (error) {
    console.error(`Error updating tanda ${tandaId}:`, error);
    return NextResponse.json(
      { message: 'Failed to update tanda.', error: error.message },
      { status: 500 }
    );
  }
}
