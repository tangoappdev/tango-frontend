import admin from 'firebase-admin';

// Prevent re-initializing the app on every hot reload in development
if (!admin.apps.length) {
  try {
    const serviceKey = process.env.FIREBASE_SERVICE_KEY_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_KEY_JSON)
      : null;

    if (!serviceKey) {
      console.error('FIREBASE_SERVICE_KEY_JSON is not set. Firebase Admin will not be initialized.');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceKey),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack || error);
  }
}

// Export functions that return the initialized services
export const getFirestore = () => admin.firestore();
export const getStorage = () => admin.storage();
export const getServerTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

// ANCHOR: admin-auth-export
export const getAuth = () => admin.auth();
export async function verifySessionCookie(sessionCookie) {
  return getAuth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
}