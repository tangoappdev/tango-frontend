import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function POST(request) {
  // 1. Authenticate the user
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tandaId } = await request.json();
    if (!tandaId) {
      return NextResponse.json({ error: 'Tanda ID is required.' }, { status: 400 });
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();

    let updatedLikedIds = [];
    const currentLikedIds = userDoc.data()?.likedTandaIds || [];

    // 2. Decide whether to add or remove the ID
    if (currentLikedIds.includes(tandaId)) {
      // It's already liked, so UNLIKE it
      await userRef.update({
        likedTandaIds: admin.firestore.FieldValue.arrayRemove(tandaId)
      });
      updatedLikedIds = currentLikedIds.filter(id => id !== tandaId);
    } else {
      // It's not liked, so LIKE it
      await userRef.update({
        likedTandaIds: admin.firestore.FieldValue.arrayUnion(tandaId)
      });
      updatedLikedIds = [...currentLikedIds, tandaId];
    }

    // 3. Return a success response
    return NextResponse.json({ success: true, likedTandaIds: updatedLikedIds });

  } catch (error) {
    console.error('Error in like-tanda API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}