import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { initialSettings } from '@/components/tangoPlayerConstants';

const ALLOWED_BOOLEAN_KEYS = new Set(['cortinas', 'cortinaFullLength']);
const ALLOWED_STRING_KEYS = new Set(['activeMode', 'categoryFilter', 'tandaMood']);
const ALLOWED_NUMBER_KEYS = new Set(['tandaLength']);

function sanitizeSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const sanitized = {};

  ALLOWED_BOOLEAN_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      const value = raw[key];
      if (typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }
  });

  ALLOWED_STRING_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      const value = raw[key];
      if (typeof value === 'string' && value.trim()) {
        const normalized = value.trim();
        if (
          key === 'tandaMood' &&
          !['balanced', 'rhythmic', 'melodic'].includes(normalized)
        ) {
          return;
        }
        sanitized[key] = normalized;
      }
    }
  });

  ALLOWED_NUMBER_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      const value = raw[key];
      if (Number.isFinite(value)) {
        sanitized[key] = Number(value);
      }
    }
  });

  if (Object.keys(sanitized).length === 0) {
    return null;
  }

  return sanitized;
}

function mergeWithDefaults(saved) {
  const base = { ...initialSettings };
  if (!saved || typeof saved !== 'object') {
    return base;
  }
  return { ...base, ...saved };
}

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    const data = doc.exists ? doc.data() : null;
    const storedSettings = data?.playerSettings || null;
    const settings = mergeWithDefaults(storedSettings);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[player-settings][GET] error:', error);
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
    const sanitized = sanitizeSettings(body?.settings);
    if (!sanitized) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set(
      {
        playerSettings: sanitized,
        playerSettingsUpdatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[player-settings][POST] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
