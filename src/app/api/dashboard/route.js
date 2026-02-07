// src/app/api/dashboard/route.js
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

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

// Fetch and calculate statistics for the admin dashboard (ADMIN ONLY)
export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const db = getFirestore();
    const tandasRef = db.collection('tandas');
    const snapshot = await tandasRef.get();
    const today = new Date().toISOString().slice(0, 10);

    const festivalsSnapshot = await db
      .collection('external_festivals')
      .where('endDate', '>=', today)
      .get();
    const overridesSnapshot = await db.collection('external_festival_overrides').get();
    const pendingMilongasSnapshot = await db
      .collection('event_submissions')
      .where('type', '==', 'milonga')
      .where('status', '==', 'pending')
      .get();
    const pendingFestivalsSnapshot = await db
      .collection('event_submissions')
      .where('type', '==', 'festival')
      .where('status', '==', 'pending')
      .get();

    const overrideMap = new Map();
    overridesSnapshot.docs.forEach((doc) => {
      overrideMap.set(doc.id, doc.data());
    });

    let festivalCount = 0;
    const countries = new Set();
    const cities = new Set();
    festivalsSnapshot.docs.forEach((doc) => {
      const festival = doc.data();
      const override = overrideMap.get(doc.id);
      const merged = { ...festival, ...(override || {}) };
      if (merged.deleted) return;
      festivalCount += 1;
      if (merged.country) countries.add(merged.country);
      if (merged.city) cities.add(`${merged.country || ''}|${merged.city}`);
    });

    if (snapshot.empty) {
      return NextResponse.json({
        totalTandas: 0,
        tandasByType: { Tango: 0, Vals: 0, Milonga: 0 },
        totalTracks: 0,
        tracksByType: { Tango: 0, Vals: 0, Milonga: 0 },
        orchestraStats: {},
        tangoMoodBreakdown: { rhythmic: 0, melodic: 0 },
        festivalStats: {
          total: festivalCount,
          countries: countries.size,
          cities: cities.size,
        },
        pendingStats: {
          milongas: pendingMilongasSnapshot.size,
          festivals: pendingFestivalsSnapshot.size,
        },
      });
    }

    let totalTandas = 0;
    const tandasByType = { Tango: 0, Vals: 0, Milonga: 0 };
    const tangoMoodBreakdown = { rhythmic: 0, melodic: 0 };
    let totalTracks = 0;
    const tracksByType = { Tango: 0, Vals: 0, Milonga: 0 };
    const orchestraStats = {};

    snapshot.docs.forEach(doc => {
      const tanda = doc.data();
      totalTandas++;

      const type = tanda.type || '';

      if (type && tandasByType.hasOwnProperty(type)) {
        tandasByType[type]++;
      }

      if (tanda.tracks && Array.isArray(tanda.tracks)) {
        const trackCount = tanda.tracks.length;
        totalTracks += trackCount;
        if (type && tracksByType.hasOwnProperty(type)) {
          tracksByType[type] += trackCount;
        }
      }

      if (tanda.orchestra) {
        if (!orchestraStats[tanda.orchestra]) {
          orchestraStats[tanda.orchestra] = {
            total: 0,
            byType: { Tango: 0, Vals: 0, Milonga: 0 },
          };
        }
        orchestraStats[tanda.orchestra].total++;
        if (type && orchestraStats[tanda.orchestra].byType.hasOwnProperty(type)) {
          orchestraStats[tanda.orchestra].byType[type]++;
        }
      }

      if (type === 'Tango') {
        const style = (tanda.meta?.styleCode || tanda.style || '').toString().trim().toLowerCase();
        if (style.includes('rhythmic')) {
          tangoMoodBreakdown.rhythmic += 1;
        } else {
          tangoMoodBreakdown.melodic += 1;
        }
      }
    });

    return NextResponse.json({
      totalTandas,
      tandasByType,
      totalTracks,
      tracksByType,
      orchestraStats,
      tangoMoodBreakdown,
      festivalStats: {
        total: festivalCount,
        countries: countries.size,
        cities: cities.size,
      },
      pendingStats: {
        milongas: pendingMilongasSnapshot.size,
        festivals: pendingFestivalsSnapshot.size,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats.', error: error.message },
      { status: 500 }
    );
  }
}
