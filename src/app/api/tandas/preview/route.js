import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// --- Constants (from your constants.js file, now moved directly here) ---
const TANDA_SEQUENCES = {
  '2TV2TM': ['Tango', 'Tango', 'Vals', 'Tango', 'Tango', 'Milonga'],
  '3TV3TM': ['Tango', 'Tango', 'Tango', 'Vals', 'Tango', 'Tango', 'Tango', 'Milonga'],
  'Just Tango': ['Tango'],
  'Just Vals': ['Vals'],
  'Just Milonga': ['Milonga'],
};

// --- Firebase Initialization ---
// This safely initializes Firebase, once per instance, using Vercel's Environment Variables.
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'tangoapp-8bd65-storage'
    });
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const SIGNED_URL_EXPIRATION_MINUTES = 15;

// --- Helper Functions (Your original code) ---
async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    let objectName = filePath;
    const bucketName = 'tangoapp-8bd65-storage';
    if (filePath.startsWith(`https://storage.googleapis.com/${bucketName}/`)) {
        objectName = filePath.substring(`https://storage.googleapis.com/${bucketName}/`.length);
    }
    if (!objectName) { return null; }

    const options = { version: 'v4', action: 'read', expires: Date.now() + SIGNED_URL_EXPIRATION_MINUTES * 60 * 1000 };
    const [url] = await bucket.file(objectName).getSignedUrl(options);
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}:`, error);
    return null;
  }
}

const findTandaForPreview = async (criteria) => {
  const { tandasRef, requiredType, categoryFilter, excludeIdSet } = criteria;
  const query = tandasRef.where('type', '==', requiredType).where('category', '==', categoryFilter);
  const snapshot = await query.get();

  if (snapshot.empty) return null;

  const allCandidates = [];
  snapshot.forEach(doc => allCandidates.push({ id: doc.id, ...doc.data() }));
  const uniqueCandidates = allCandidates.filter(tanda => !excludeIdSet.has(tanda.id));

  if (uniqueCandidates.length > 0) {
    return uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
  } else if (allCandidates.length > 0) {
    return allCandidates[Math.floor(Math.random() * allCandidates.length)];
  }
  return null;
};


// --- The Main API Route Handler for Vercel ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('categoryFilter');
    const excludeIds = searchParams.get('excludeIds');
    const tandaOrder = searchParams.get('tandaOrder') || '2TV2TM';
    const requiredType = searchParams.get('requiredType');
    const limit = searchParams.get('limit') || 6;

    if (!categoryFilter) {
      return NextResponse.json({ message: 'categoryFilter is required.' }, { status: 400 });
    }

    const tandasRef = db.collection('tandas');
    const excludeIdSet = new Set(excludeIds ? excludeIds.split(',') : []);
    const upcomingTandas = [];
    let sequenceArray = [];

    if (tandaOrder && TANDA_SEQUENCES[tandaOrder]) {
      sequenceArray = TANDA_SEQUENCES[tandaOrder];
    } else if (requiredType) {
      sequenceArray = Array(parseInt(limit, 10)).fill(requiredType);
    }

    if (sequenceArray.length === 0) {
      throw new Error("No valid sequence or requiredType provided.");
    }

    for (const typeOfTandaInSequence of sequenceArray) {
      const foundTanda = await findTandaForPreview({
        tandasRef,
        requiredType: typeOfTandaInSequence,
        categoryFilter,
        excludeIdSet
      });
      if (foundTanda) {
        upcomingTandas.push(foundTanda);
        excludeIdSet.add(foundTanda.id);
      }
    }
    
    const tandasWithSignedUrls = await Promise.all(
      upcomingTandas.map(async (tanda) => ({
        ...tanda,
        artwork_signed: await generateV4ReadSignedUrl(tanda.artwork),
        tracks_signed: await Promise.all(tanda.tracks.map(async (track) => ({ ...track, url_signed: await generateV4ReadSignedUrl(track.url) }))),
      }))
    );
    
    return NextResponse.json({ upcomingTandas: tandasWithSignedUrls });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ message: 'Error generating tanda preview.', error: error.message }, { status: 500 });
  }
}