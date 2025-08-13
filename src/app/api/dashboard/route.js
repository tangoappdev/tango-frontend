import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';

// This API route fetches and calculates all the statistics for the admin dashboard.
export async function GET() {
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
      
      // Increment total tanda count
      totalTandas++;
      
      // Increment tanda count by type
      if (tanda.type && tandasByType.hasOwnProperty(tanda.type)) {
        tandasByType[tanda.type]++;
      }

      // Process tracks
      if (tanda.tracks && Array.isArray(tanda.tracks)) {
        const trackCount = tanda.tracks.length;
        totalTracks += trackCount;
        if (tanda.type && tracksByType.hasOwnProperty(tanda.type)) {
          tracksByType[tanda.type] += trackCount;
        }
      }

      // Process orchestra stats
      if (tanda.orchestra) {
        if (!orchestraStats[tanda.orchestra]) {
          orchestraStats[tanda.orchestra] = {
            total: 0,
            byType: { Tango: 0, Vals: 0, Milonga: 0 }
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
    return NextResponse.json({ message: 'Failed to fetch stats.', error: error.message }, { status: 500 });
  }
}
