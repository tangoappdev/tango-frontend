import { NextResponse } from 'next/server';
import { callSync, getWeekdayInTimeZone, requireCronAuth } from '../_utils';

const WEEKLY_PATHS = ['/api/sources/tangocat/sync'];

export async function GET(request) {
  const auth = requireCronAuth(request);
  if (auth.error) return auth.error;

  const { token, origin } = auth;
  const weekday = getWeekdayInTimeZone('America/New_York');
  if (weekday !== 'Monday') {
    return NextResponse.json({ ok: true, skipped: true, weekday }, { status: 200 });
  }

  const results = await Promise.all(WEEKLY_PATHS.map((path) => callSync(origin, token, path)));
  const ok = results.every((result) => result.ok);

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}
