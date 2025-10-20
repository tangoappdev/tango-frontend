import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { buildQueueStateKey } from '@/lib/queueStateUtils';

const CATEGORY_KEYS = ['TM', 'TR', 'V', 'M'];
const MAX_QUEUE_IDS = 50;
const MAX_HISTORY = 200;
const MAX_ORCHESTRAS = 20;
const QUEUE_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function sanitizeIdList(list, limit = MAX_QUEUE_IDS) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (let i = 0; i < list.length; i += 1) {
    if (result.length >= limit) break;
    const raw = list[i];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function sanitizeGeneratorState(state) {
  if (!state || typeof state !== 'object') return null;
  const sanitized = {};

  const seqIndex = Number.isFinite(state.seqIndex) ? Math.max(0, Math.floor(state.seqIndex)) : 0;
  sanitized.seqIndex = seqIndex;

  sanitized.nextTangoSubtype = state.nextTangoSubtype === 'rhythmic' ? 'rhythmic' : 'melodic';

  sanitized.lastTangoOrchestras = sanitizeIdList(state.lastTangoOrchestras, MAX_ORCHESTRAS);

  sanitized.history = sanitizeIdList(state.history, MAX_HISTORY);

  sanitized.unplayed = {};
  CATEGORY_KEYS.forEach((key) => {
    const source = state.unplayed && Array.isArray(state.unplayed[key]) ? state.unplayed[key] : [];
    sanitized.unplayed[key] = sanitizeIdList(source, 500);
  });

  return sanitized;
}

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') || '').trim();
  const activeMode = (searchParams.get('mode') || '').trim();

  if (!category || !activeMode) {
    return NextResponse.json({ error: 'Missing category or mode' }, { status: 400 });
  }

  try {
    const key = buildQueueStateKey(category, activeMode);
    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    const data = doc.exists ? doc.data() : null;
    const entry = data?.queueStates?.[key] || null;

    if (!entry || entry.category !== category || entry.activeMode !== activeMode) {
      return NextResponse.json({ state: null });
    }

    const updatedAt = entry.updatedAt ? new Date(entry.updatedAt) : null;
    const isExpired = !updatedAt || Number.isNaN(updatedAt.getTime())
      ? true
      : (Date.now() - updatedAt.getTime()) > QUEUE_STATE_MAX_AGE_MS;

    if (isExpired) {
      return NextResponse.json({ state: null, expired: true });
    }

    return NextResponse.json({
      state: entry.state || null,
      manualIds: Array.isArray(entry.manualIds) ? entry.manualIds : [],
      upcomingIds: Array.isArray(entry.upcomingIds) ? entry.upcomingIds : [],
      currentTandaId: typeof entry.currentTandaId === 'string' ? entry.currentTandaId : null,
      version: Number.isFinite(entry.version) ? entry.version : null,
      updatedAt: entry.updatedAt || null,
    });
  } catch (error) {
    console.error('[queue-state][GET] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const activeMode = typeof body.activeMode === 'string' ? body.activeMode.trim() : '';
    const version = Number.isFinite(body.version) ? Math.floor(body.version) : 0;
    const state = sanitizeGeneratorState(body.state);

    if (!category || !activeMode || !state) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const manualIds = sanitizeIdList(body.manualIds);
    const upcomingIds = sanitizeIdList(body.upcomingIds);
    const currentTandaId = typeof body.currentTandaId === 'string' ? body.currentTandaId.trim() || null : null;

    const key = buildQueueStateKey(category, activeMode);
    const payload = {
      category,
      activeMode,
      version,
      state,
      manualIds,
      upcomingIds,
      currentTandaId,
      updatedAt: new Date().toISOString(),
    };

    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set(
      {
        queueStates: {
          [key]: payload,
        },
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[queue-state][POST] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
