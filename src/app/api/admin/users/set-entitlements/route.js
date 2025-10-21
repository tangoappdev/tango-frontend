import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

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

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  let body = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { uid, action, days } = body || {};
  if (!uid || !action) {
    return NextResponse.json({ error: 'Missing uid or action' }, { status: 400 });
  }

  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const now = new Date();
  const data = snap.exists ? snap.data() || {} : {};

  const update = {
    updatedAt: now.toISOString(),
  };

  const FieldValue = admin.firestore.FieldValue;

  const normalizeDays = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback;
  };

  try {
    switch (action) {
      case 'grant_pro_days': {
        const duration = normalizeDays(days, 30);
        const until = new Date(now);
        until.setDate(until.getDate() + duration);
        update.manual = {
          tier: 'pro',
          until: until.toISOString(),
          grantedAt: now.toISOString(),
          source: 'admin',
          days: duration,
        };
        update.plan = 'pro';
        update.status = 'active';
        update.tier = 'pro';
        update.isPro = true;
        update.trialEndsAt = FieldValue.delete();
        break;
      }
      case 'set_pro_permanent': {
        update.manual = {
          tier: 'pro',
          until: null,
          grantedAt: now.toISOString(),
          source: 'admin',
        };
        update.plan = 'pro';
        update.status = 'active';
        update.tier = 'pro';
        update.isPro = true;
        update.trialEndsAt = FieldValue.delete();
        break;
      }
      case 'set_trial_days': {
        const duration = normalizeDays(days, 7);
        const until = new Date(now);
        until.setDate(until.getDate() + duration);
        update.trialEndsAt = until.toISOString();
        update.status = 'trial';
        update.plan = data.plan && data.plan !== 'pro' ? data.plan : 'free';
        update.tier = 'trial';
        update.isPro = false;
        update.manual = FieldValue.delete();
        break;
      }
      case 'clear_manual': {
        update.manual = FieldValue.delete();
        const stillPro = data.plan === 'pro' && data.status === 'active';
        update.isPro = Boolean(stillPro);
        if (!stillPro) {
          const trialEnds = data.trialEndsAt ? new Date(data.trialEndsAt).getTime() : 0;
          const trialActive = trialEnds > now.getTime();
          if (trialActive) {
            update.status = 'trial';
            update.tier = 'trial';
          } else {
            update.status = 'free';
            update.tier = 'free';
            update.plan = data.plan === 'pro' ? 'free' : (data.plan || 'free');
            update.trialEndsAt = FieldValue.delete();
          }
        }
        break;
      }
      case 'set_free': {
        update.manual = FieldValue.delete();
        update.plan = 'free';
        update.status = 'free';
        update.tier = 'free';
        update.isPro = false;
        update.trialEndsAt = FieldValue.delete();
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await userRef.set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update entitlements:', error);
    return NextResponse.json({ error: 'Failed to update entitlements' }, { status: 500 });
  }
}
