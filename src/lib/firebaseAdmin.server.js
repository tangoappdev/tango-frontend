import admin from 'firebase-admin';

// This prevents re-initializing the app on every hot reload in development
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_KEY_JSON)),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

// Export functions that return the initialized services
export const getFirestore = () => admin.firestore();
export const getStorage = () => admin.storage();
export const getServerTimestamp = () => admin.firestore.FieldValue.serverTimestamp();