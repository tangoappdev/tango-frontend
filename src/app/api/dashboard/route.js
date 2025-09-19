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

    if (snapshot.empty) {
      return NextResponse.json({
        totalTandas: 0,
        tandasByType: { Tango: 0, Vals: 0, Milonga: 0 },
        totalTracks: 0,
        tracksByType: { Tango: 0, Vals: 0, Milonga: 0 },
        orchestraStats: {},
      });
    }

    let totalTandas = 0;
    const tandasByType = { Tango: 0, Vals: 0, Milonga: 0 };
    let totalTracks = 0;
    const tracksByType = { Tango: 0, Vals: 0, Milonga: 0 };
    const orchestraStats = {};

    snapshot.docs.forEach(doc => {
      const tanda = doc.data();
      totalTandas++;

      if (tanda.type && tandasByType.hasOwnProperty(tanda.type)) {
        tandasByType[tanda.type]++;
      }

      if (tanda.tracks && Array.isArray(tanda.tracks)) {
        const trackCount = tanda.tracks.length;
        totalTracks += trackCount;
        if (tanda.type && tracksByType.hasOwnProperty(tanda.type)) {
          tracksByType[tanda.type] += trackCount;
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
        if (tanda.type && orchestraStats[tanda.orchestra].byType.hasOwnProperty(tanda.type)) {
          orchestraStats[tanda.orchestra].byType[tanda.type]++;
        }
      }
    });

    return NextResponse.json({
      totalTandas,
      tandasByType,
      totalTracks,
      tracksByType,
      orchestraStats,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats.', error: error.message },
      { status: 500 }
    );
  }
}
