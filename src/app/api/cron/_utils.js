import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function requireCronAuth(request) {
  const token = process.env.SOURCE_SYNC_TOKEN;
  if (!token) {
    return { error: NextResponse.json({ error: 'SOURCE_SYNC_TOKEN not configured' }, { status: 500 }) };
  }

  const vercelCron = request.headers.get('x-vercel-cron');
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const providedSecret =
    request.headers.get('x-cron-token') || url.searchParams.get('cronToken');

  if (!vercelCron && (!cronSecret || providedSecret !== cronSecret)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { token, origin: url.origin };
}

export async function callSync(origin, token, path) {
  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'x-sync-token': token,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { path, ok: res.ok, status: res.status, data };
}

export function getWeekdayInTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  });
  return formatter.format(new Date());
}
