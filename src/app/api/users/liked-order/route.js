import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

function sanitizeIdList(list) {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  list.forEach((id) => {
    if (typeof id === 'string') {
      const trimmed = id.trim();
      if (trimmed) cleaned.push(trimmed);
    }
  });
  return Array.from(new Set(cleaned));
}

function sanitizeMixedOrder(order, tandaSet, cortinaSet) {
  if (!Array.isArray(order)) return [];
  const seen = new Set();
  const result = [];
  for (const entry of order) {
    if (!entry || typeof entry !== 'object') continue;
    const type = entry.type === 'cortina' ? 'cortina' : entry.type === 'tanda' ? 'tanda' : null;
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!type || !id) continue;
    if (type === 'tanda' && !tandaSet.has(id)) continue;
    if (type === 'cortina' && !cortinaSet.has(id)) continue;
    const key = `${type}-${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ type, id });
  }
  tandaSet.forEach(id => {
    const key = `tanda-${id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ type: 'tanda', id });
    }
  });
  cortinaSet.forEach(id => {
    const key = `cortina-${id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ type: 'cortina', id });
    }
  });
  return result;
}

export async function POST(request) {
  console.log('[liked-order] incoming request');
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const tandaIds = sanitizeIdList(body?.tandaIds);
    const cortinaIds = sanitizeIdList(body?.cortinaIds);
    console.log('[liked-order] raw body', body);
    console.log('[liked-order] sanitized IDs', { tandaIds, cortinaIds });
    const tandaSet = new Set(tandaIds);
    const cortinaSet = new Set(cortinaIds);
    const mixedOrder = sanitizeMixedOrder(body?.order, tandaSet, cortinaSet);
    console.log('[liked-order] sanitized mixedOrder', mixedOrder);

    console.log('[liked-order] writing to Firestore');
    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set(
      {
        likedTandaIds: tandaIds,
        likedCortinaIds: cortinaIds,
        likedMixedOrder: mixedOrder,
      },
      { merge: true }
    );

    const responsePayload = {
      success: true,
      likedTandaIds: tandaIds,
      likedCortinaIds: cortinaIds,
      likedMixedOrder: mixedOrder,
    };
    console.log('[liked-order] response payload', responsePayload);
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[liked-order] Error saving liked order:', error);
    console.log('[liked-order] payload on error', { user: user?.uid, body });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

