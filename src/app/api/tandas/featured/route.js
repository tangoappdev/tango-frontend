import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';

const SIGNED_URL_EXPIRATION_MINUTES = 60;

async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const [url] = await getStorage()
      .bucket()
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + SIGNED_URL_EXPIRATION_MINUTES * 60 * 1000,
      });
    return url;
  } catch (error) {
    console.error(`Failed to sign artwork URL for ${filePath}: ${error.message}`);
    return null;
  }
}

const normalizeKey = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(6, Number(searchParams.get('limit') || 24));

    const db = getFirestore();
    const snapshot = await db.collection('tandas').orderBy('createdAt', 'desc').limit(400).get();

    const byOrchestra = new Map();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const orchestra = data.orchestra || '';
      const key = normalizeKey(orchestra);
      if (!key || byOrchestra.has(key)) return;
      byOrchestra.set(key, {
        id: doc.id,
        orchestra,
        singer: data.singer || '',
        artwork_url: data.artwork_url || null,
      });
    });

    const featured = Array.from(byOrchestra.values()).slice(0, limit);
    const withSigned = await Promise.all(
      featured.map(async (tanda) => ({
        ...tanda,
        artwork_signed: await generateV4ReadSignedUrl(tanda.artwork_url),
      }))
    );

    return NextResponse.json({ ok: true, tandas: withSigned });
  } catch (error) {
    console.error('Error in /api/tandas/featured:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to load tandas' },
      { status: 500 }
    );
  }
}
