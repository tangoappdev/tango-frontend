// ANCHOR: api-users-me (REPLACE WHOLE FILE)
import { NextResponse } from 'next/server';
import { getFirestore, getAuth } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { isAuthenticated: false },
      { status: 200, headers: { 'cache-control': 'no-store' } }
    );
  }

  // Fetch user claims to check for admin role
  let userClaims = {};
  try {
    const userRecord = await getAuth().getUser(user.uid);
    userClaims = userRecord.customClaims || {};
  } catch (e) {
    console.error("Error fetching user claims:", e);
  }
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const isAdminEmail = adminEmails.includes((user.email || '').toLowerCase());

  const db = getFirestore();
  let profile = null;
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) profile = doc.data();
  } catch {}


  const subscriptionStatus = profile?.subscriptionStatus || null;
  const trialEndsAt = profile?.trialEndsAt ? new Date(profile.trialEndsAt).getTime() : 0;
  const currentPeriodEnd = profile?.currentPeriodEnd ? new Date(profile.currentPeriodEnd).getTime() : 0;
  const isPro =
    profile?.isPro === true ||
    ['active', 'trialing', 'past_due'].includes(subscriptionStatus);
  const tier = profile?.tier || (isPro ? 'pro' : 'free');
  const trialActive = trialEndsAt > Date.now();

  const advancedAccess = !!profile?.advancedAccess;

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
      isAdmin: !!userClaims.admin || isAdminEmail,
      isPro,
      subscriptionStatus,
      stripeCustomerId: profile?.stripeCustomerId || null,
      stripeSubscriptionId: profile?.stripeSubscriptionId || null,
      planId: profile?.planId || null,
      currentPeriodEnd: currentPeriodEnd || null,
      trialActive,
      trialEndsAt,
      likedTandaIds: profile?.likedTandaIds || [],
      likedCortinaIds: profile?.likedCortinaIds || [],
      likedMixedOrder: profile?.likedMixedOrder || [],
      advancedAccess,
    },
    { status: 200, headers: { 'cache-control': 'no-store' } }
  );
}
// ANCHOR: api-users-me (END)

