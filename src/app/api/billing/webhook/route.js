import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirestore, getServerTimestamp } from '@/lib/firebaseAdmin.server.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

function toMillis(value) {
  if (!value) return null;
  try {
    return Number(value) * 1000;
  } catch {
    return null;
  }
}

async function findUserRef(subscription) {
  const db = getFirestore();
  const firebaseUid =
    subscription?.metadata?.firebaseUid ||
    subscription?.metadata?.firebase_uid ||
    null;

  if (firebaseUid) {
    return db.collection('users').doc(firebaseUid);
  }

  if (subscription?.customer) {
    const snap = await db
      .collection('users')
      .where('stripeCustomerId', '==', subscription.customer)
      .limit(1)
      .get();
    if (!snap.empty) {
      return snap.docs[0].ref;
    }
  }

  return null;
}

async function upsertSubscriptionRecord(subscription) {
  const userRef = await findUserRef(subscription);
  if (!userRef) {
    console.warn('Stripe webhook: user not found for subscription', subscription.id);
    return;
  }

  const currentPeriodEndMillis = toMillis(subscription.current_period_end);
  const trialEndMillis = toMillis(subscription.trial_end);

  const isPro = ACTIVE_STATUSES.has(subscription.status);
  const planItem = subscription.items?.data?.[0] ?? null;

  const payload = {
    stripeCustomerId: subscription.customer ?? null,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    planId: planItem?.price?.id ?? null,
    planProductId: planItem?.price?.product ?? null,
    currentPeriodEnd: currentPeriodEndMillis,
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    trialEndsAt: trialEndMillis,
    isPro,
    tier: isPro ? 'pro' : 'free',
    updatedAt: getServerTimestamp(),
  };

  await userRef.set(payload, { merge: true });
}

export async function POST(request) {
  const signature = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await upsertSubscriptionRecord(subscription);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await upsertSubscriptionRecord(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await upsertSubscriptionRecord(subscription);
        }
        break;
      }
      default:
        // Ignore other events for now
        break;
    }
  } catch (error) {
    console.error('Stripe webhook handler error', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
