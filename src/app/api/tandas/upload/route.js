// src/app/api/tandas/upload/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getServerTimestamp } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const db = getFirestore();

// ---------- Admin guard ----------
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(decodedUser) {
  const email = (decodedUser?.email || '').toLowerCase();
  return decodedUser?.admin === true || ADMIN_EMAILS.includes(email);
}

async function requireAdmin(request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isAdmin(user)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

// Save tanda metadata (ADMIN ONLY)
export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const tandaData = await request.json();

    if (
      !tandaData.orchestra ||
      !tandaData.type ||
      !tandaData.tracks ||
      !Array.isArray(tandaData.tracks) ||
      tandaData.tracks.length === 0
    ) {
      return NextResponse.json({ message: 'Missing required tanda data.' }, { status: 400 });
    }

    // Normalization (labels -> codes)
    const CATEGORY_CODE = {
      'Traditional (Golden Age)': 'traditional',
      'Contemporary Traditional': 'contemporary',
      'Alternative / Alternativo': 'alternative',
    };
    const TYPE_CODE = { Tango: 'tango', Vals: 'vals', Milonga: 'milonga' };
    const STYLE_CODE = { Rhythmic: 'rhythmic', Melodic: 'melodic' };
    const instrumental = !tandaData.singer || tandaData.singer.trim() === '';

    const newTandaDocument = {
      orchestra: tandaData.orchestra,
      singer: tandaData.singer || '',
      type: tandaData.type,
      category: tandaData.category,
      style: tandaData.style || null,
      artwork_url: tandaData.artworkPath,
      tracks: tandaData.tracks.map((track) => ({
        title: track.title,
        url: track.filePath, // stored storage path
      })),
      createdAt: getServerTimestamp(),
      // Non-breaking, future-proof metadata
      meta: {
        instrumental,
        typeCode: TYPE_CODE[tandaData.type] || null,
        categoryCode: CATEGORY_CODE[tandaData.category] || null,
        styleCode: tandaData.style ? STYLE_CODE[tandaData.style] || null : null,
        tandaLength: Array.isArray(tandaData.tracks) ? tandaData.tracks.length : null,
      },
    };

    const docRef = await db.collection('tandas').add(newTandaDocument);

    return NextResponse.json(
      {
        message: 'Tanda saved successfully!',
        tandaId: docRef.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in upload metadata API:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON body provided.' }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Failed to save tanda metadata.', error: error.message },
      { status: 500 }
    );
  }
}
