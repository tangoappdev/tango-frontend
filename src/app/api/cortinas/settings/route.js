import { NextResponse } from 'next/server';
import { getFirestore, getAuth } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(userRecord, decodedToken) {
  if (userRecord?.customClaims?.admin === true || decodedToken?.admin === true) {
    return true;
  }
  const email = (userRecord?.email || decodedToken?.email || '').toLowerCase();
  return ADMIN_EMAILS.includes(email);
}

async function verifyAdmin(request) {
  const decoded = await getUserFromRequest(request);
  if (!decoded) {
    return null;
  }

  try {
    const userRecord = await getAuth().getUser(decoded.uid);
    if (isAdmin(userRecord, decoded)) {
      return userRecord;
    }
  } catch (error) {
    console.error('Error verifying admin status:', error);
  }

  return isAdmin(null, decoded) ? decoded : null;
}

const SETTINGS_COLLECTION = 'appSettings';
const SETTINGS_DOC = 'cortinaFade';

const sanitize = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
};

async function readFadeSettings() {
  const db = getFirestore();
  const doc = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).get();
  const data = doc.exists ? doc.data() || {} : {};
  return {
    fadeInSeconds: sanitize(data.fadeInSeconds),
    fadeOutSeconds: sanitize(data.fadeOutSeconds),
  };
}

export async function GET() {
  try {
    const settings = await readFadeSettings();
    return NextResponse.json(settings, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching cortina fade settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const adminUser = await verifyAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const fadeInSeconds = sanitize(payload?.fadeInSeconds);
    const fadeOutSeconds = sanitize(payload?.fadeOutSeconds);

    const db = getFirestore();
    await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).set(
      {
        fadeInSeconds,
        fadeOutSeconds,
      },
      { merge: true },
    );

    return NextResponse.json({ fadeInSeconds, fadeOutSeconds });
  } catch (error) {
    console.error('Error updating cortina fade settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
