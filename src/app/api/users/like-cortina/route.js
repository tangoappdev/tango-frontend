import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { cortinaId } = await request.json();
    if (!cortinaId) {
      return NextResponse.json({ error: 'Cortina ID is required.' }, { status: 400 });
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const currentLikedIds = userDoc.exists && Array.isArray(userDoc.data()?.likedCortinaIds)
      ? userDoc.data().likedCortinaIds.filter(Boolean)
      : [];

    let updatedLikedIds;
    if (currentLikedIds.includes(cortinaId)) {
      await userRef.set({ likedCortinaIds: admin.firestore.FieldValue.arrayRemove(cortinaId) }, { merge: true });
      updatedLikedIds = currentLikedIds.filter(id => id !== cortinaId);
    } else {
      await userRef.set({ likedCortinaIds: admin.firestore.FieldValue.arrayUnion(cortinaId) }, { merge: true });
      updatedLikedIds = [...currentLikedIds, cortinaId];
    }

    return NextResponse.json({ success: true, likedCortinaIds: updatedLikedIds });
  } catch (error) {
    console.error('Error in like-cortina API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

