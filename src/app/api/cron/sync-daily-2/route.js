import { NextResponse } from 'next/server';
import { callSync, requireCronAuth } from '../_utils';

const DAILY_PATHS = [
  '/api/sources/hoymilonga-turkiye/sync',
  '/api/sources/hoymilonga-england/sync',
  '/api/sources/hoymilonga-miami/sync',
  '/api/sources/tangomango-san-francisco/sync',
  '/api/sources/tango-argentin-paris/sync',
];

export async function GET(request) {
  const auth = requireCronAuth(request);
  if (auth.error) return auth.error;

  const { token, origin } = auth;
  const results = await Promise.all(DAILY_PATHS.map((path) => callSync(origin, token, path)));
  const ok = results.every((result) => result.ok);

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}
