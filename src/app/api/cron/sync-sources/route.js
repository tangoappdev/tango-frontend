import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYNC_PATHS = [
  '/api/sources/newyorktango/sync',
  '/api/sources/hoymilonga-buenos-aires/sync',
];

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

  const results = await Promise.all(SYNC_PATHS.map((path) => callSync(origin, token, path)));
  const ok = results.every((result) => result.ok);

  return NextResponse.json(
    {
      ok,
      results,
    },
    { status: ok ? 200 : 500 }
  );
}
