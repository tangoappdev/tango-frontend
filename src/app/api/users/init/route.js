// src/app/api/users/init/route.js
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '7', 10);

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();

    const now = new Date();
    if (!snap.exists) {
      const ends = new Date(now);
      ends.setDate(now.getDate() + TRIAL_DAYS);
      await ref.set({
        status: 'trial',
        plan: 'free',
        trialEndsAt: ends.toISOString(),
        createdAt: now.toISOString(),
      });
    } else {
      // Ensure required fields exist (idempotent)
      const data = snap.data() || {};
      const update = {};
      if (!data.createdAt) update.createdAt = now.toISOString();
      if (!data.status && !data.trialEndsAt) {
        const ends = new Date(now);
        ends.setDate(now.getDate() + TRIAL_DAYS);
        update.status = 'trial';
        update.plan = data.plan || 'free';
        update.trialEndsAt = ends.toISOString();
      }
      if (Object.keys(update).length) await ref.update(update);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
