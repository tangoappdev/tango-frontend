// src/app/api/auth/session/route.js
import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import '@/lib/firebaseAdmin.server.js'; // ensure Admin SDK is initialized

export async function POST(req) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // 7 days
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // ms
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });

    const res = NextResponse.json({ ok: true });
    res.cookies.set('__session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // false on localhost
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(expiresIn / 1000),
    });
    return res;
  } catch (e) {
    console.error('Failed to create session', e);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}
