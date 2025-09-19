// src/app/api/usage/skip-tanda/route.js
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const LIMIT_PER_HOUR = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request) {
  // Must be signed in
  const decoded = await getUserFromRequest(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uid = decoded.uid;
  const db = getFirestore();

  try {
    // Determine tier (Pro/Trial vs Free)
    const userDoc = await db.collection('users').doc(uid).get();
    const u = userDoc.exists ? userDoc.data() : {};
    const now = Date.now();
    const trialActive = u?.trialEndsAt ? now < new Date(u.trialEndsAt).getTime() : false;
    const isPro = u?.status === 'active' || u?.plan === 'pro';

    // Pro/Trial: unlimited skip tanda
    if (isPro || trialActive) {
      return NextResponse.json({ allowed: true, remaining: null });
    }

    // Free: 3 per rolling hour — enforce with a transaction
    let result = { allowed: false, remaining: 0, resetAt: null };

    await db.runTransaction(async (tx) => {
      const ref = db.collection('users').doc(uid);
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const usage = data.usage || {};
      const skip = usage.skipTanda || {}; // { windowStart: ISO, count: number }

      const nowMs = Date.now();
      let windowStartMs = skip.windowStart ? new Date(skip.windowStart).getTime() : 0;
      let count = skip.count || 0;

      // Start/reset the rolling window if empty or expired
      if (!windowStartMs || (nowMs - windowStartMs) >= WINDOW_MS) {
        windowStartMs = nowMs;
        count = 0;
      }

      if (count >= LIMIT_PER_HOUR) {
        // Over the limit — no state change
        result = {
          allowed: false,
          remaining: 0,
          resetAt: new Date(windowStartMs + WINDOW_MS).toISOString(),
        };
        return;
      }

      // Increment and persist
      count += 1;
      const nextData = {
        usage: {
          ...usage,
          skipTanda: {
            windowStart: new Date(windowStartMs).toISOString(),
            count,
          },
        },
        updatedAt: new Date().toISOString(),
      };

      tx.set(ref, nextData, { merge: true });

      result = {
        allowed: true,
        remaining: LIMIT_PER_HOUR - count,
        resetAt: new Date(windowStartMs + WINDOW_MS).toISOString(),
      };
    });

    const status = result.allowed ? 200 : 429;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error('POST /api/usage/skip-tanda error:', error);
    return NextResponse.json({ error: 'Failed to process skip' }, { status: 500 });
  }
}
