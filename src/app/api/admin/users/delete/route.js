import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuth, getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

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

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active', 'past_due', 'unpaid']);

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { uid } = body || {};
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const db = getFirestore();
  const auth = getAuth();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const profile = snap.exists ? snap.data() || {} : null;

  const subscriptionId = profile?.stripeSubscriptionId || null;
  const profileStatus = (profile?.status || '').toLowerCase();

  if (subscriptionId && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const stripeStatus = subscription?.status;
      if (stripeStatus && ACTIVE_SUBSCRIPTION_STATUSES.has(stripeStatus)) {
        return NextResponse.json(
          {
            error:
              'Cannot delete this user while their Stripe subscription is active. Cancel the subscription first.',
            stripeStatus,
          },
          { status: 409 }
        );
      }
    } catch (error) {
      if (error?.code !== 'resource_missing') {
        console.error(`Failed to verify subscription ${subscriptionId} before deletion:`, error);
        return NextResponse.json(
          {
            error:
              'Unable to verify the Stripe subscription status. Cancel it manually in Stripe and try again.',
          },
          { status: 409 }
        );
      }
    }
  } else if (ACTIVE_SUBSCRIPTION_STATUSES.has(profileStatus)) {
    return NextResponse.json(
      {
        error:
          'Cannot delete this user while their subscription status is active. Cancel the subscription first.',
        status: profileStatus,
      },
      { status: 409 }
    );
  }

  try {
    await userRef.delete();
    await auth.deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`Failed to delete user ${uid}:`, error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
