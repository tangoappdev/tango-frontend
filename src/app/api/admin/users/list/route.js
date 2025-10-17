// src/app/api/admin/users/list/route.js
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import Stripe from 'stripe';
import { getAuth } from '@/lib/firebaseAdmin.server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

// ---------- Admin guard ----------
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
function isAdmin(decodedUser) {
  const email = (decodedUser?.email || '').toLowerCase();
  return decodedUser?.admin === true || ADMIN_EMAILS.includes(email);
}
async function requireAdmin(request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isAdmin(user)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

function formatPriceLabel(price) {
  if (!price) return null;
  const currency = (price.currency || 'usd').toUpperCase();
  const unitAmount = typeof price.unit_amount === 'number' ? price.unit_amount / 100 : null;
  const amountText =
    unitAmount !== null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(unitAmount)
      : null;
  const interval = price.recurring?.interval || null;
  const intervalCount = price.recurring?.interval_count || 1;
  let cadence = '';
  if (interval) {
    cadence = intervalCount > 1 ? `${intervalCount} ${interval}s` : interval;
  }

  const parts = [];
  if (price.nickname) parts.push(price.nickname);
  if (amountText) parts.push(cadence ? `${amountText} / ${cadence}` : amountText);
  const productName =
    price.product && typeof price.product === 'object' && 'name' in price.product
      ? price.product.name
      : null;
  if (parts.length === 0 && productName) parts.push(productName);

  return parts.join(' • ') || amountText || price.id;
}

// --- Main Handler ---
export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const pageToken = searchParams.get('pageToken') || undefined;
    const query = searchParams.get('q')?.toLowerCase() || '';

    const auth = getAuth();
    const db = getFirestore();

    // 1. Fetch users from Firebase Auth
    const listUsersResult = await auth.listUsers(pageSize, pageToken);

    // 2. Fetch corresponding profiles from Firestore
    const uids = listUsersResult.users.map(u => u.uid);
    const profileDocs = uids.length ? await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', uids).get() : [];
    const profilesByUid = {};
    profileDocs.forEach(doc => {
      profilesByUid[doc.id] = doc.data();
    });

    // 3. Merge Auth data with Firestore data
    let mergedUsers = listUsersResult.users.map(authUser => {
      const profile = profilesByUid[authUser.uid] || {};
      const now = Date.now();
      const trialEndsAt = profile.trialEndsAt ? new Date(profile.trialEndsAt).getTime() : 0;
      const trialActive = trialEndsAt > now;

      const subscriptionStatus = profile.subscriptionStatus || profile.status || null;
      const planId = profile.planId || profile.plan || null;
      const inferredIsPro =
        profile.isPro === true ||
        ['active', 'trialing', 'past_due'].includes(subscriptionStatus) ||
        planId === 'pro';

      let tier = profile.tier || 'free';
      if (inferredIsPro) tier = 'pro';
      else if (trialActive) tier = 'trial';

      return {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        disabled: authUser.disabled,
        createdAt: authUser.metadata.creationTime,
        lastSignInTime: authUser.metadata.lastSignInTime,
        // From Firestore profile
        planId,
        plan: planId,
        status: subscriptionStatus,
        trialEndsAt: profile.trialEndsAt || null,
        manual: profile.manual || null,
        stripeCustomerId: profile.stripeCustomerId || null,
        stripeSubscriptionId: profile.stripeSubscriptionId || null,
        // Derived
        tier,
        isPro: inferredIsPro,
      };
    });

    if (stripe) {
      const planIds = [...new Set(mergedUsers.map(user => user.planId).filter(Boolean))];
      const planLabelMap = {};
      for (const planId of planIds) {
        try {
          const price = await stripe.prices.retrieve(planId, { expand: ['product'] });
          planLabelMap[planId] = formatPriceLabel(price) || planId;
        } catch (error) {
          console.error(`Error retrieving Stripe price ${planId}:`, error?.message || error);
          planLabelMap[planId] = planId;
        }
      }
      mergedUsers = mergedUsers.map(user => ({
        ...user,
        plan: user.planId ? planLabelMap[user.planId] || user.planId : null,
      }));
    } else {
      mergedUsers = mergedUsers.map(user => ({
        ...user,
        plan: user.planId || null,
      }));
    }

    // 4. Apply search filter if query exists
    if (query) {
      mergedUsers = mergedUsers.filter(u => 
        u.displayName?.toLowerCase().includes(query) || 
        u.email?.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      users: mergedUsers,
      nextPageToken: listUsersResult.pageToken,
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}

