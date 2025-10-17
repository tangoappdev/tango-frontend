import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getFirestore, getServerTimestamp } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const PLAN_PRICE_MAP = {
  'pro-monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
  'pro-yearly': process.env.STRIPE_PRICE_PRO_YEARLY,
};

function resolveOrigin(request) {
  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000';
  return origin.replace(/\/$/, '');
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const planId =
      payload.planId ||
      request.nextUrl?.searchParams?.get('plan') ||
      null;

    if (!planId || !PLAN_PRICE_MAP[planId]) {
      return NextResponse.json({ error: 'Unknown plan selected' }, { status: 400 });
    }

    const priceId = PLAN_PRICE_MAP[planId];
    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    const userSnap = await userRef.get();
    const userRecord = userSnap.exists ? userSnap.data() : {};

    let customerId = userRecord?.stripeCustomerId || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          firebaseUid: user.uid,
        },
      });
      customerId = customer.id;
      await userRef.set(
        {
          stripeCustomerId: customerId,
          email: user.email ?? null,
          updatedAt: getServerTimestamp(),
        },
        { merge: true }
      );
    }

    const origin = resolveOrigin(request);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${origin}/pricing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      metadata: {
        firebaseUid: user.uid,
        planId,
      },
      subscription_data: {
        metadata: {
          firebaseUid: user.uid,
          planId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create Stripe Checkout session', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
