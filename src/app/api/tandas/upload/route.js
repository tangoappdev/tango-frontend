import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// --- Firebase Initialization ---
// Safely initialize Firebase Admin SDK, ensuring it only runs once per instance.
if (!admin.apps.length) {
  try {
    // This reads the service account key from your Vercel environment variables.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
}

const db = admin.firestore();

/**
 * API Route to save tanda metadata to Firestore.
 * This function expects a JSON payload with the tanda details, including the
 * paths to files that have already been uploaded directly to Firebase Storage.
 */
export async function POST(request) {
  try {
    // --- NEW LOGGING: Let's see what the server is actually receiving ---
    console.log('--- UPLOAD API HIT ---');
    console.log('Request Headers:', JSON.stringify(Object.fromEntries(request.headers), null, 2));
    
    // 1. Parse the incoming request body as JSON.
    // This is the `finalTandaData` object sent from your TandaForm.js.
    const tandaData = await request.json();

    // --- NEW LOGGING: Log the parsed data ---
    console.log('Parsed JSON Body:', JSON.stringify(tandaData, null, 2));

    // 2. Basic validation to ensure required fields are present.
    if (!tandaData.orchestra || !tandaData.type || !tandaData.tracks || tandaData.tracks.length === 0) {
      return NextResponse.json({ message: 'Missing required tanda data.' }, { status: 400 });
    }

    // 3. Prepare the final document to be saved in Firestore.
    // We use the exact field names that your player component (`TangoPlayer.js`) expects.
    const newTandaDocument = {
      orchestra: tandaData.orchestra,
      singer: tandaData.singer || '', // Default to empty string if not provided
      type: tandaData.type,
      category: tandaData.category,
      style: tandaData.style || null,
      // The player looks for 'artwork_url' and 'url' inside the tracks array.
      artwork_url: tandaData.artworkPath, 
      tracks: tandaData.tracks.map(track => ({
        title: track.title,
        url: track.filePath, // Match the field name the player expects
      })),
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Add a server-side timestamp
    };

    // 4. Add the new document to the 'tandas' collection.
    const docRef = await db.collection('tandas').add(newTandaDocument);

    console.log('✅ Successfully saved tanda metadata to Firestore with ID:', docRef.id);

    // 5. Return a success response.
    return NextResponse.json({
      message: 'Tanda saved successfully!',
      tandaId: docRef.id
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error in upload metadata API:', error);
    // Provide a more specific error if the JSON is malformed.
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON body provided.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to save tanda metadata.', error: error.message }, { status: 500 });
  }
}
