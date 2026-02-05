import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getFirestore } from '@/lib/firebaseAdmin.server';

export const revalidate = 3600;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://tangotube.tv';
const SOURCE_ID = 'tangotube';

const cleanText = (value) => (value || '').replace(/\s+/g, ' ').trim();

async function scrapeFallback(limit = 16) {
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
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    videos.push({
      id: videoId,
      title,
      channel,
      metadata,
      duration,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail,
    });
  });

  return videos;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 16, 1), 60);

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('external_videos')
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    const videos = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: data.videoId || doc.id.replace(`${SOURCE_ID}_`, ''),
        title: data.title || '',
        channel: data.channel || '',
        metadata: data.metadata || '',
        duration: data.duration || '',
        url: data.youtubeUrl || '',
        thumbnail: data.thumbnail || '',
        source: data.source || '',
      };
    });

    const filtered = videos.filter((video) => !video.source || video.source === SOURCE_ID);

    if (!filtered.length) {
      const fallback = await scrapeFallback(limit);
      return NextResponse.json({ ok: true, videos: fallback, fallback: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true, videos: filtered }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to load videos' },
      { status: 500 }
    );
  }
}
