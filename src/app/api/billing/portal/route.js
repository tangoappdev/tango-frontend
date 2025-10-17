import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

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

    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const userRecord = userSnap.data();
    const customerId = userRecord?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Stripe customer not found for this account' },
        { status: 400 }
      );
    }

    const origin = resolveOrigin(request);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/pricing?portal=return`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create billing portal session', error);
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}
