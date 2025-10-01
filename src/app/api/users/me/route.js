// ANCHOR: api-users-me (REPLACE WHOLE FILE)
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { isAuthenticated: false },
      { status: 200, headers: { 'cache-control': 'no-store' } }
    );
  }

  const db = getFirestore();
  let profile = null;
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) profile = doc.data();
  } catch {}

  const tier = profile?.tier || 'free';
  const trialEndsAt = profile?.trialEndsAt ? new Date(profile.trialEndsAt).getTime() : 0;
  const trialActive = trialEndsAt > Date.now();
  const likedTandaIds = Array.isArray(profile?.likedTandaIds) ? profile.likedTandaIds.filter(Boolean) : [];
  const likedCortinaIds = Array.isArray(profile?.likedCortinaIds) ? profile.likedCortinaIds.filter(Boolean) : [];
  const tandaIdSet = new Set(likedTandaIds);
  const cortinaIdSet = new Set(likedCortinaIds);
  const likedMixedOrder = Array.isArray(profile?.likedMixedOrder)
    ? profile.likedMixedOrder
        .map(entry => ({ type: entry?.type, id: typeof entry?.id === 'string' ? entry.id : null }))
        .filter(entry => {
          if (!entry.id) return false;
          if (entry.type === 'tanda' && tandaIdSet.has(entry.id)) return true;
          if (entry.type === 'cortina' && cortinaIdSet.has(entry.id)) return true;
          return false;
        })
    : [];
  const isPro = Boolean(profile?.isPro);

  return NextResponse.json(
    {
      isAuthenticated: true,
      uid: user.uid,
      email: user.email ?? profile?.email ?? null,
      displayName:
        profile?.displayName ||
        user.name ||
        (user.email ? user.email.split('@')[0] : ''),
      photoURL: profile?.photoURL || '',
      tier,
      trialActive,
      isPro,
      likedTandaIds,
      likedCortinaIds,
      likedMixedOrder,
    },
    { status: 200, headers: { 'cache-control': 'no-store' } }
  );
}
// ANCHOR: api-users-me (END)
