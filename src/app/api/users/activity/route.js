import { NextResponse } from 'next/server';
import { getFirestore, getServerTimestamp } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
];

function extractClientIp(request) {
  const headerCandidates = [
    request.headers.get('x-forwarded-for'),
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-real-ip'),
    request.headers.get('x-client-ip'),
  ];

  for (const raw of headerCandidates) {
    if (!raw) continue;
    const first = raw.split(',')[0]?.trim();
    if (!first) continue;
    let ip = first;
    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
    if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
    if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) ip = ip.split(':')[0];
    if (ip) return ip;
  }
  return null;
}

function isPrivateIp(ip) {
  if (!ip) return true;
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

async function lookupLocation(ip) {
  if (!ip || isPrivateIp(ip)) return null;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VirtualTangoDJ/1.0 (+https://virtualtangodj.com)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;

    const location = {
      city: data.city || null,
      region: data.region || data.region_name || null,
      country: data.country_name || null,
      countryCode: data.country || null,
      timezone: data.timezone || null,
      source: 'ipapi',
    };

    const hasValue = Object.values(location).some((value, index) => value && index < 4);
    return hasValue ? location : null;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[users/activity] Geo lookup failed', error);
    }
    return null;
  } finally {
    clearTimeout(id);
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getFirestore();
  const userRef = db.collection('users').doc(user.uid);

  try {
    const ip = extractClientIp(request);
    const snapshot = await userRef.get();
    const existing = snapshot.exists ? snapshot.data() || {} : {};

    let locationData = null;
    if (ip && (!existing.lastActivityIp || existing.lastActivityIp !== ip || !existing.lastActivityLocation)) {
      locationData = await lookupLocation(ip);
    }

    const updatePayload = {
      lastActivityAt: getServerTimestamp(),
      lastActivityType: 'play',
    };

    if (ip && !isPrivateIp(ip)) {
      updatePayload.lastActivityIp = ip;
    }

    if (locationData) {
      updatePayload.lastActivityLocation = locationData;
    }

    await userRef.set(updatePayload, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[users/activity][POST] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
