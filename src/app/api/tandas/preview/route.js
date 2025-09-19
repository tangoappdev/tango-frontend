// ANCHOR: api-tandas-preview (REPLACE WHOLE FILE)
// src/app/api/tandas/preview/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

// --- Constants ---
const TANDA_SEQUENCES = {
  '2 Tangos, 1 Vals, 2 Tangos, 1 Milonga': ['Tango', 'Tango', 'Vals', 'Tango', 'Tango', 'Milonga'],
  '3 Tangos, 1 Vals, 3 Tangos, 1 Milonga': ['Tango', 'Tango', 'Tango', 'Vals', 'Tango', 'Tango', 'Tango', 'Milonga'],
};
const SIGNED_URL_EXPIRATION_MINUTES = 60;

// --- Helpers ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
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
    console.error(`!!! FAILED to generate signed URL for ${filePath}. Error: ${error.message}`);
    return null;
  }
}

// --- Route ---
export async function GET(request) {
  try {
    
    const user = await getUserFromRequest(request).catch(() => null);

    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('categoryFilter');
    const excludeIds = searchParams.get('excludeIds') || '';
    const requiredType = searchParams.get('requiredType');
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const tandaOrder = searchParams.get('tandaOrder') || '2TV2TM';

    if (!categoryFilter) {
      return NextResponse.json({ message: 'categoryFilter is required.' }, { status: 400 });
    }

    // 1) Build the required type sequence
    let sequenceArray = [];
    if (requiredType) {
      sequenceArray = Array(limit).fill(requiredType);
    } else if (TANDA_SEQUENCES[tandaOrder]) {
      sequenceArray = TANDA_SEQUENCES[tandaOrder];
    } else {
      return NextResponse.json({ message: 'Invalid tandaOrder/requiredType.' }, { status: 400 });
    }

    const db = getFirestore();

    // 2) Preload pools by type (filtered by category) — in parallel for speed
    // ANCHOR: fetch-pools-parallel
    const [tangoSnap, valsSnap, milongaSnap] = await Promise.all([
      db.collection('tandas').where('type', '==', 'Tango').where('category', '==', categoryFilter).get(),
      db.collection('tandas').where('type', '==', 'Vals').where('category', '==', categoryFilter).get(),
      db.collection('tandas').where('type', '==', 'Milonga').where('category', '==', categoryFilter).get(),
    ]);
    const poolsByType = {
  Tango: shuffleArray(tangoSnap.docs.map(d => ({ id: d.id, ...d.data() }))),
  Vals: shuffleArray(valsSnap.docs.map(d => ({ id: d.id, ...d.data() }))),
  Milonga: shuffleArray(milongaSnap.docs.map(d => ({ id: d.id, ...d.data() }))),
};

    // 3) Helper: pick by type, prefer unseen, fallback within type
    const excludeIdSet = new Set(excludeIds ? excludeIds.split(',').filter(Boolean) : []);
    function pickByTypeWithFallback(type) {
      const pool = poolsByType[type] || [];
      if (pool.length === 0) return null;
      const unseen = pool.filter(t => !excludeIdSet.has(t.id));
      if (unseen.length > 0) return unseen[Math.floor(Math.random() * unseen.length)];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 4) Fill sequence with HARD SLOT GUARANTEE (+ soft de-dupe)
    // ANCHOR: assemble-sequence
    const upcomingTandas = [];
    for (const required of sequenceArray) {
      const pick = pickByTypeWithFallback(required);
      if (!pick) {
        console.warn(`No tandas of type ${required} in category ${categoryFilter}`);
        continue;
      }
      const last = upcomingTandas[upcomingTandas.length - 1];
      let chosen = pick;
      const pool = poolsByType[required] || [];
      if (last && last.id === pick.id && pool.length > 1) {
        const alt = pool.find(t => t.id !== last.id);
        if (alt) chosen = alt;
      }
      upcomingTandas.push(chosen);
      excludeIdSet.add(chosen.id);
    }

    // 5) Fetch ALL cortinas (no genre filter)
    const cortinasSnap = await db.collection('cortinas').get();
    const availableCortinas = cortinasSnap.empty
      ? []
      : cortinasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 6) Attach signed URLs
    // ANCHOR: sign-urls
    const tandasWithSignedUrls = await Promise.all(
      upcomingTandas.map(async (tanda) => ({
        ...tanda,
        artwork_signed: await generateV4ReadSignedUrl(tanda.artwork_url),
        tracks_signed: await Promise.all(
          (tanda.tracks || []).map(async (track) => ({
            ...track,
            url_signed: await generateV4ReadSignedUrl(track.url || track.filePath),
          }))
        ),
      }))
    );

    // ANCHOR: success-response
    return new NextResponse(
      JSON.stringify({
        upcomingTandas: tandasWithSignedUrls,
        availableCortinas,
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'private, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('Error in /api/tandas/preview:', error);
    return NextResponse.json(
      { message: 'Error generating tanda preview.', error: error.message },
      { status: 500 }
    );
  }
}
// ANCHOR: api-tandas-preview (END)
