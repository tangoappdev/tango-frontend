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

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);
const priceCache = new Map();

function toMillis(seconds) {
  return typeof seconds === 'number' ? seconds * 1000 : null;
}

function toAmount(amount, currency) {
  if (typeof amount !== 'number') return null;
  return {
    amount,
    amountDecimal: amount / 100,
    currency: currency || 'usd',
  };
}

function resolveOrigin(request) {
  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000';
  return origin.replace(/\/$/, '');
}

async function fetchPrice(priceId) {
  if (!priceId) return null;
  if (priceCache.has(priceId)) return priceCache.get(priceId);
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product'],
  });
  priceCache.set(priceId, price);
  return price;
}

async function buildPlanOptions() {
  const plans = [
    {
      id: 'free',
      label: 'Free',
      description: 'Access the basic player experience.',
      priceId: null,
      interval: null,
      amount: 0,
      amountDecimal: 0,
      currency: 'usd',
    },
    {
      id: 'pro-monthly',
      label: 'Pro (Monthly)',
      description: 'Full pro features billed every month.',
      priceId: PLAN_PRICE_MAP['pro-monthly'] || null,
    },
    {
      id: 'pro-yearly',
      label: 'Pro (Yearly)',
      description: 'Best value – two months free when billed yearly.',
      priceId: PLAN_PRICE_MAP['pro-yearly'] || null,
    },
  ];

  for (const plan of plans) {
    if (!plan.priceId) continue;
    try {
      const price = await fetchPrice(plan.priceId);
      plan.amount = price?.unit_amount ?? null;
      plan.amountDecimal = price?.unit_amount ? price.unit_amount / 100 : null;
      plan.currency = price?.currency ?? 'usd';
      plan.interval = price?.recurring?.interval ?? null;
      plan.intervalCount = price?.recurring?.interval_count ?? null;
      plan.nickname = price?.nickname || price?.product?.name || plan.label;
    } catch (error) {
      console.error('Failed to load Stripe price', plan.priceId, error);
      plan.amount = null;
      plan.amountDecimal = null;
      plan.currency = 'usd';
      plan.interval = null;
      plan.intervalCount = null;
      plan.nickname = plan.label;
    }
  }

  return plans;
}

function manualProActive(manual) {
  if (!manual || manual.tier !== 'pro') return false;
  if (!manual.until) return true;
  const until = new Date(manual.until);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > Date.now();
}

async function syncSubscriptionRecord(userRef, subscription, profile = null) {
  if (!userRef) return;
  if (!subscription) {
    const manual = profile?.manual ?? null;
    const manualActive = manualProActive(manual);
    await userRef.set(
      {
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        planId: null,
        planProductId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        isPro: manualActive ? true : false,
        tier: manualActive ? 'pro' : 'free',
        updatedAt: getServerTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  const planItem = subscription.items?.data?.[0] ?? null;
  const payload = {
    stripeCustomerId: subscription.customer ?? null,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    planId: planItem?.price?.id ?? null,
    planProductId: planItem?.price?.product ?? null,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    isPro: ACTIVE_STATUSES.has(subscription.status),
    tier: ACTIVE_STATUSES.has(subscription.status) ? 'pro' : 'free',
    updatedAt: getServerTimestamp(),
  };

  await userRef.set(payload, { merge: true });
}

function detectPlanId(priceId) {
  if (!priceId) return null;
  const entry = Object.entries(PLAN_PRICE_MAP).find(([, value]) => value === priceId);
  return entry ? entry[0] : null;
}

function mapPaymentMethod(paymentMethod) {
  if (!paymentMethod || typeof paymentMethod !== 'object') return null;
  return {
    id: paymentMethod.id,
    brand: paymentMethod.card?.brand ?? null,
    last4: paymentMethod.card?.last4 ?? null,
    expMonth: paymentMethod.card?.exp_month ?? null,
    expYear: paymentMethod.card?.exp_year ?? null,
    wallet: paymentMethod.card?.wallet?.type ?? null,
    billingName: paymentMethod.billing_details?.name ?? null,
    billingEmail: paymentMethod.billing_details?.email ?? null,
  };
}

function mapInvoice(invoice) {
  return {
    id: invoice.id,
    status: invoice.status,
    number: invoice.number ?? null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
    created: toMillis(invoice.created),
    periodStart: toMillis(invoice.period_start),
    periodEnd: toMillis(invoice.period_end),
    subtotal: toAmount(invoice.subtotal, invoice.currency),
    total: toAmount(invoice.total, invoice.currency),
    amountPaid: toAmount(invoice.amount_paid, invoice.currency),
    amountRemaining: toAmount(invoice.amount_remaining, invoice.currency),
    tax: toAmount(invoice.tax, invoice.currency),
    currency: invoice.currency,
    lines: invoice.lines?.data?.map((line) => ({
      id: line.id,
      description: line.description ?? null,
      quantity: line.quantity ?? null,
      amount: toAmount(line.amount, invoice.currency),
      periodStart: toMillis(line.period?.start),
      periodEnd: toMillis(line.period?.end),
    })),
  };
}

function mapSubscription(subscription) {
  if (!subscription) return null;
  const planItem = subscription.items?.data?.[0] ?? null;
  const price = planItem?.price ?? null;
  const detectedPlan = detectPlanId(price?.id);

  return {
    id: subscription.id,
    status: subscription.status,
    isActive: ACTIVE_STATUSES.has(subscription.status),
    planId: detectedPlan ?? price?.id ?? null,
    priceId: price?.id ?? null,
    productId: price?.product ?? null,
    nickname: price?.nickname ?? null,
    amount: toAmount(price?.unit_amount ?? null, price?.currency),
    interval: price?.recurring?.interval ?? null,
    intervalCount: price?.recurring?.interval_count ?? null,
    quantity: planItem?.quantity ?? 1,
    currentPeriodStart: toMillis(subscription.current_period_start),
    currentPeriodEnd: toMillis(subscription.current_period_end),
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    cancelAt: toMillis(subscription.cancel_at),
    canceledAt: toMillis(subscription.canceled_at),
    trialStart: toMillis(subscription.trial_start),
    trialEnd: toMillis(subscription.trial_end),
    pauseCollection: subscription.pause_collection ?? null,
    defaultPaymentMethod: mapPaymentMethod(subscription.default_payment_method),
    latestInvoiceId: typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id ?? null,
    livemode: !!subscription.livemode,
  };
}

async function loadInvoices(customerId) {
  if (!customerId) return [];
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
    });
    return invoices.data.map(mapInvoice);
  } catch (error) {
    console.error('Failed to load invoices for customer', customerId, error);
    return [];
  }
}

async function loadUpcomingInvoice(subscriptionId) {
  if (!subscriptionId) return null;
  try {
    const upcoming = await stripe.invoices.retrieveUpcoming({
      subscription: subscriptionId,
    });
    return mapInvoice(upcoming);
  } catch (error) {
    if (error?.code === 'invoice_upcoming_none') return null;
    console.warn('Failed to load upcoming invoice', subscriptionId, error.message);
    return null;
  }
}

async function ensureSubscription(customerId) {
  if (!customerId) return null;
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 1,
    expand: ['data.default_payment_method', 'data.items.data.price.product'],
  });
  return subscriptions.data[0] ?? null;
}

async function getUserProfile(uid) {
  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  return { userRef, profile: snap.exists ? snap.data() : {} };
}

async function retrieveSubscription(subscriptionId) {
  if (!subscriptionId) return null;
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'items.data.price.product'],
  });
}

async function getSubscriptionForUser(profile) {
  if (!profile) return null;
  const subscriptionId = profile.stripeSubscriptionId;
  if (subscriptionId) {
    try {
      return await retrieveSubscription(subscriptionId);
    } catch (error) {
      if (error?.statusCode === 404) {
        console.warn('Stored subscription not found on Stripe', subscriptionId);
        return null;
      }
      throw error;
    }
  }
  if (profile.stripeCustomerId) {
    return ensureSubscription(profile.stripeCustomerId);
  }
  return null;
}

async function respondWithState(userRef, profile, subscription, extra = {}) {
  if (subscription) {
    await syncSubscriptionRecord(userRef, subscription, profile);
  } else {
    await syncSubscriptionRecord(userRef, null, profile);
  }

  const planOptions = await buildPlanOptions();
  const invoices = await loadInvoices(profile?.stripeCustomerId ?? null);
  const upcomingInvoice = subscription
    ? await loadUpcomingInvoice(subscription.id)
    : null;

  return NextResponse.json({
    customerId: profile?.stripeCustomerId ?? null,
    subscription: mapSubscription(subscription),
    invoices,
    upcomingInvoice,
    planOptions,
    ...extra,
  });
}

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userRef, profile } = await getUserProfile(user.uid);
    const subscription = await getSubscriptionForUser(profile);

    if (subscription && !profile?.stripeSubscriptionId) {
      await userRef.set(
        {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer ?? profile?.stripeCustomerId ?? null,
          updatedAt: getServerTimestamp(),
        },
        { merge: true }
      );
    }

    return await respondWithState(userRef, profile, subscription);
  } catch (error) {
    console.error('Billing subscription GET failed', error);
    return NextResponse.json({ error: 'Failed to load billing details' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const action = payload?.action;
  if (!action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 });
  }

  const allowedActions = new Set([
    'change_plan',
    'cancel',
    'resume',
    'pause',
    'resume_pause',
    'update_payment_method',
    'refresh',
  ]);

  if (!allowedActions.has(action)) {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  try {
    const origin = resolveOrigin(request);
    const { userRef, profile } = await getUserProfile(user.uid);
    let subscription = await getSubscriptionForUser(profile);

    let customerId = profile?.stripeCustomerId ?? null;

    if (!customerId && action === 'update_payment_method') {
      try {
        const customer = await stripe.customers.create({
          email: user.email ?? profile?.email ?? undefined,
          metadata: { firebaseUid: user.uid },
        });
        customerId = customer.id;
        profile.stripeCustomerId = customerId;
        await userRef.set(
          {
            stripeCustomerId: customerId,
            email: user.email ?? profile?.email ?? null,
            updatedAt: getServerTimestamp(),
          },
          { merge: true }
        );
      } catch (creationError) {
        console.error('Failed to create Stripe customer for payment update', creationError);
        return NextResponse.json(
          { error: 'Could not create a billing profile for this account' },
          { status: 500 }
        );
      }
    }

    if (!profile?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe customer not found for this account' },
        { status: 400 }
      );
    }

    let portalUrl = null;

    switch (action) {
      case 'change_plan': {
        const requestedPlanId = payload?.planId ?? null;
        const priceId =
          payload?.priceId ||
          (requestedPlanId ? PLAN_PRICE_MAP[requestedPlanId] : null);

        if (!priceId) {
          return NextResponse.json({ error: 'Unknown plan selected' }, { status: 400 });
        }

        if (!subscription) {
          subscription = await ensureSubscription(profile.stripeCustomerId);
        }

        if (!subscription) {
          return NextResponse.json(
            { error: 'No active subscription found to update' },
            { status: 409 }
          );
        }

        const currentItem = subscription.items?.data?.[0];
        if (!currentItem) {
          return NextResponse.json(
            { error: 'Unable to determine current subscription item' },
            { status: 409 }
          );
        }

        const updated = await stripe.subscriptions.update(subscription.id, {
          items: [
            {
              id: currentItem.id,
              price: priceId,
            },
          ],
          proration_behavior: payload?.prorationBehavior || 'create_prorations',
          expand: ['default_payment_method', 'items.data.price.product'],
        });
        subscription = updated;
        break;
      }
      case 'cancel': {
        if (!subscription) {
          return NextResponse.json(
            { error: 'No active subscription found to cancel' },
            { status: 409 }
          );
        }

        if (payload?.cancelNow) {
          const canceled = await stripe.subscriptions.cancel(subscription.id, {
            invoice_now: !!payload?.invoiceNow,
            prorate: payload?.prorate ?? true,
          });
          subscription = canceled;
        } else {
          const updated = await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true,
            expand: ['default_payment_method', 'items.data.price.product'],
          });
          subscription = updated;
        }
        break;
      }
      case 'resume': {
        if (!subscription) {
          return NextResponse.json(
            { error: 'No subscription found to resume' },
            { status: 409 }
          );
        }
        const updated = await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: false,
          expand: ['default_payment_method', 'items.data.price.product'],
        });
        subscription = updated;
        break;
      }
      case 'pause': {
        if (!subscription) {
          return NextResponse.json(
            { error: 'No active subscription found to pause' },
            { status: 409 }
          );
      }
      const behavior = payload?.behavior || 'mark_uncollectible';
      const updated = await stripe.subscriptions.update(subscription.id, {
        pause_collection: { behavior },
        expand: ['default_payment_method', 'items.data.price.product'],
        });
        subscription = updated;
        break;
      }
      case 'resume_pause': {
        if (!subscription) {
          return NextResponse.json(
            { error: 'No subscription found to resume' },
            { status: 409 }
          );
      }
      const updated = await stripe.subscriptions.update(subscription.id, {
        pause_collection: null,
        expand: ['default_payment_method', 'items.data.price.product'],
      });
      subscription = updated;
      break;
      }
      case 'update_payment_method': {
        const configurationId =
          process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim() || undefined;

        const sessionParams = {
          customer: profile.stripeCustomerId,
          return_url: `${origin}/manage_subscription?portal=return`,
        };

        if (configurationId) {
          sessionParams.configuration = configurationId;
        }

        portalUrl = await stripe.billingPortal.sessions
          .create(sessionParams)
          .then((session) => session.url);
        break;
      }
      case 'refresh': {
        if (subscription?.id) {
          subscription = await retrieveSubscription(subscription.id);
        } else {
          subscription = await ensureSubscription(profile.stripeCustomerId);
        }
        break;
      }
      default:
        break;
    }

    return await respondWithState(userRef, profile, subscription, {
      portalUrl,
    });
  } catch (error) {
    console.error('Billing subscription PATCH failed', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
