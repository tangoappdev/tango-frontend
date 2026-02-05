import { NextResponse } from 'next/server';
import { callSync, requireCronAuth } from '../_utils';

const DAILY_PATHS = [
  '/api/sources/newyorktango/sync',
  '/api/sources/hoymilonga-buenos-aires/sync',
  '/api/sources/hoymilonga-berlin/sync',
  '/api/sources/hoymilonga-sao-paulo/sync',
  '/api/sources/hoymilonga-athens/sync',
];

export async function GET(request) {
  const auth = requireCronAuth(request);
  if (auth.error) return auth.error;

  const { token, origin } = auth;
  const results = await Promise.all(DAILY_PATHS.map((path) => callSync(origin, token, path)));
  const ok = results.every((result) => result.ok);

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}
