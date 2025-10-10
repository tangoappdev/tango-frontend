import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';

function normalizeStyle(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function normalizeType(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function normalizeOrchestra(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('categoryFilter');

    if (!categoryFilter) {
      return NextResponse.json(
        { message: 'categoryFilter is required.' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const snapshot = await db
      .collection('tandas')
      .where('category', '==', categoryFilter)
      .get();

    const buckets = {
      tangoMelodic: [],
      tangoRhythmic: [],
      vals: [],
      milonga: [],
    };
    const metaById = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const base = {
        id: doc.id,
        orchestra: data.orchestra || '',
        singer: data.singer || '',
        type: data.type || '',
        style: data.style || null,
        category: data.category || categoryFilter,
        meta: data.meta || {},
        artwork_url: data.artwork_url || null,
      };

      const typeCode =
        normalizeType(base.meta?.typeCode) || normalizeType(base.type);
      const styleCode =
        normalizeStyle(base.meta?.styleCode) || normalizeStyle(base.style);

      if (typeCode === 'tango') {
        if (styleCode === 'rhythmic') {
          buckets.tangoRhythmic.push(base.id);
        } else {
          // default to melodic when style is missing/unknown
          buckets.tangoMelodic.push(base.id);
        }
      } else if (typeCode === 'vals') {
        buckets.vals.push(base.id);
      } else if (typeCode === 'milonga') {
        buckets.milonga.push(base.id);
      }

      const orchestraKey = normalizeOrchestra(base.orchestra);
      metaById[base.id] = {
        orchestra: base.orchestra,
        singer: base.singer,
        type: base.type,
        style: base.style,
        typeCode,
        styleCode,
        orchestraKey,
      };
    });

    return NextResponse.json(
      {
        buckets,
        metaById,
      },
      {
        status: 200,
        headers: {
          'cache-control': 'private, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('Error in /api/tandas/library:', error);
    return NextResponse.json(
      { message: 'Failed to load tanda library.', error: error.message },
      { status: 500 }
    );
  }
}
