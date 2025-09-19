// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === 'production';

  const base = {
    value: '',
    httpOnly: true,
    secure: isProd,   // must be true for __Host-__session in prod
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };

  // Clear both names to cover prod (__Host-__session) and dev (__session)
  res.cookies.set({ name: '__Host-__session', ...base });
  res.cookies.set({ name: '__session', ...base });

  return res;
}
