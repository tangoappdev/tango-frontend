import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getFirestore } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_ID = 'tangotube';
const SOURCE_URL = 'https://tangotube.tv/';
const BASE_URL = 'https://tangotube.tv';

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const cleanText = (value) => (value || '').replace(/\s+/g, ' ').trim();

function parsePublishedDate(metadata, now = new Date()) {
  if (!metadata) return null;
  const parts = metadata.split('•').map((part) => part.trim());
  const datePart = parts[0] || '';
  const match = datePart.match(/([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const monthKey = match[1].toLowerCase();
  const year = Number(match[2]);
  if (!(monthKey in MONTHS) || Number.isNaN(year)) return null;
  const date = new Date(Date.UTC(year, MONTHS[monthKey], 1));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() > now.getTime()) return null;
  return date.toISOString().slice(0, 10);
}

async function fetchVideos(limit = 24) {
  const res = await fetch(`${BASE_URL}/`, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; TangoAppBot/1.0; +https://virtualtangodj.com)',
      accept: 'text/html',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const videos = [];

  $('.video-card').each((_, element) => {
    if (videos.length >= limit) return;
    const card = $(element);
    const watchHref = card.find('a[href^="/watch?v="]').first().attr('href') || '';
    const videoId = watchHref.includes('v=')
      ? new URLSearchParams(watchHref.split('?')[1] || '').get('v')
      : null;
    if (!videoId) return;

    const title = cleanText(card.find('.video-card__title').first().text());
    const channel = cleanText(card.find('.video-card__metadata a').first().text());
    const metadata = cleanText(card.find('.video-card__metadata').first().text());
    const duration = cleanText(card.find('.video-card__duration').first().text());
    const publishedDate = parsePublishedDate(metadata);
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    videos.push({
      id: videoId,
      title,
      channel,
      metadata,
      duration,
      publishedDate,
      thumbnail,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  });

  return videos;
}

export async function POST(request) {
  const token = request.headers.get('x-sync-token');
  if (!token || token !== process.env.SOURCE_SYNC_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const db = getFirestore();

  try {
    const videos = await fetchVideos(40);
    const now = new Date();
    let written = 0;

    await Promise.all(
      videos.map(async (video) => {
        const docId = `${SOURCE_ID}_${video.id}`;
        const payload = {
          source: SOURCE_ID,
          sourceUrl: SOURCE_URL,
          videoId: video.id,
          youtubeUrl: video.youtubeUrl,
          title: video.title || null,
          channel: video.channel || null,
          metadata: video.metadata || null,
          duration: video.duration || null,
          thumbnail: video.thumbnail || null,
          publishedDate: video.publishedDate || null,
          updatedAt: now.toISOString(),
        };
        await db.collection('external_videos').doc(docId).set(payload, { merge: true });
        written += 1;
      })
    );

    await db.collection('external_sources').doc(SOURCE_ID).set(
      {
        source: SOURCE_ID,
        sourceUrl: SOURCE_URL,
        lastRunAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        status: 'ok',
        durationMs: Date.now() - startedAt,
        eventCount: written,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, videosParsed: videos.length, videosWritten: written });
  } catch (error) {
    await db.collection('external_sources').doc(SOURCE_ID).set(
      {
        source: SOURCE_ID,
        sourceUrl: SOURCE_URL,
        lastRunAt: new Date().toISOString(),
        status: 'error',
        error: error?.message || 'Sync failed',
      },
      { merge: true }
    );

    return NextResponse.json(
      { ok: false, error: error?.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
