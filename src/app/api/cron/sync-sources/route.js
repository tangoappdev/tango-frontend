import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAILY_PATHS = [
  '/api/sources/newyorktango/sync',
  '/api/sources/hoymilonga-buenos-aires/sync',
  '/api/sources/hoymilonga-berlin/sync',
  '/api/sources/hoymilonga-sao-paulo/sync',
  '/api/sources/hoymilonga-athens/sync',
  '/api/sources/hoymilonga-turkiye/sync',
  '/api/sources/hoymilonga-england/sync',
  '/api/sources/hoymilonga-miami/sync',
  '/api/sources/tangomango-san-francisco/sync',
  '/api/sources/tango-argentin-paris/sync',
  '/api/sources/milongueandoroma/sync',
  '/api/sources/austin-tango/sync',
  '/api/sources/agendadeltango-barcelona/sync',
  '/api/sources/tangotube/sync',
];

const WEEKLY_PATHS = ['/api/sources/tangocat/sync'];

function getWeekdayInTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  });
  return formatter.format(new Date());
}

async function callSync(origin, token, path) {
  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'x-sync-token': token,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { path, ok: res.ok, status: res.status, data };
}

export async function GET(request) {
  const token = process.env.SOURCE_SYNC_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'SOURCE_SYNC_TOKEN not configured' }, { status: 500 });
  }

  const vercelCron = request.headers.get('x-vercel-cron');
  if (!vercelCron) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const origin = new URL(request.url).origin;

  const results = await Promise.all(DAILY_PATHS.map((path) => callSync(origin, token, path)));
  const weekday = getWeekdayInTimeZone('America/New_York');
  if (weekday === 'Monday') {
    const weeklyResults = await Promise.all(
      WEEKLY_PATHS.map((path) => callSync(origin, token, path))
    );
    results.push(...weeklyResults);
  }
  const ok = results.every((result) => result.ok);

  return NextResponse.json(
    {
      ok,
      results,
    },
    { status: ok ? 200 : 500 }
  );
}
