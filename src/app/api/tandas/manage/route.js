// src/app/api/tandas/manage/route.js
import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const db = getFirestore();
const storage = getStorage();

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

// Fetch all tandas for the management page (ADMIN ONLY)
export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const tandasRef = db.collection('tandas');
    const [tandasSnapshot, usersSnapshot] = await Promise.all([
      tandasRef.orderBy('createdAt', 'desc').get(),
      db.collection('users').select('likedTandaIds').get(),
    ]);

    if (tandasSnapshot.empty) {
      return NextResponse.json({ tandas: [], summary: {
        totalTandas: 0,
        totalOrchestras: 0,
        tango: { total: 0, rhythmic: 0, melodic: 0 },
        vals: 0,
        milonga: 0,
        totalLikes: 0,
      } }, { status: 200 });
    }

    const likeCounts = {};
    usersSnapshot.forEach(userDoc => {
      const likedIds = userDoc.data()?.likedTandaIds || [];
      likedIds.forEach(id => {
        if (!id) return;
        likeCounts[id] = (likeCounts[id] || 0) + 1;
      });
    });

    const tandas = tandasSnapshot.docs.map(doc => ({
      id: doc.id,
      likesCount: likeCounts[doc.id] || 0,
      ...doc.data(),
    }));

    const orchestraSet = new Set();
    const summary = {
      totalTandas: tandas.length,
      totalOrchestras: 0,
      tango: { total: 0, rhythmic: 0, melodic: 0 },
      vals: 0,
      milonga: 0,
      totalLikes: 0,
    };

    tandas.forEach(tanda => {
      const orchestraKey = typeof tanda.orchestra === 'string' ? tanda.orchestra.trim().toLowerCase() : '';
      if (orchestraKey) orchestraSet.add(orchestraKey);

      const type = tanda.type || '';
      const style = (tanda.meta?.styleCode || tanda.style || '').toString().trim().toLowerCase();
      summary.totalLikes += tanda.likesCount ?? 0;

      if (type === 'Tango') {
        summary.tango.total += 1;
        if (style.includes('rhythmic')) {
          summary.tango.rhythmic += 1;
        } else {
          summary.tango.melodic += 1;
        }
      } else if (type === 'Vals') {
        summary.vals += 1;
      } else if (type === 'Milonga') {
        summary.milonga += 1;
      }
    });
    summary.totalOrchestras = orchestraSet.size;

    return NextResponse.json({ tandas, summary });
  } catch (error) {
    console.error('Error fetching tandas for management:', error);
    return NextResponse.json(
      { message: 'Failed to fetch tandas.', error: error.message },
      { status: 500 }
    );
  }
}

// Delete a tanda and its associated files (ADMIN ONLY)
export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { searchParams } = new URL(request.url);
    const tandaId = searchParams.get('id');

    if (!tandaId) {
      return NextResponse.json({ message: 'Tanda ID is required.' }, { status: 400 });
    }

    const tandaRef = db.collection('tandas').doc(tandaId);
    const tandaDoc = await tandaRef.get();

    if (!tandaDoc.exists) {
      return NextResponse.json({ message: 'Tanda not found.' }, { status: 404 });
    }

    const tandaData = tandaDoc.data();
    const filePathsToDelete = [];

    // artwork
    if (tandaData.artwork_url) {
      filePathsToDelete.push(tandaData.artwork_url);
    }

    // tracks
    if (tandaData.tracks && Array.isArray(tandaData.tracks)) {
      tandaData.tracks.forEach(track => {
        const path = track.url || track.filePath;
        if (path) filePathsToDelete.push(path);
      });
    }

    // delete files
    if (filePathsToDelete.length > 0) {
      await Promise.all(
        filePathsToDelete.map(filePath =>
          storage
            .bucket()
            .file(filePath)
            .delete()
            .catch(err =>
              console.error(`Failed to delete file ${filePath}, it may not exist.`, err.message)
            )
        )
      );
    }

    // delete Firestore doc
    await tandaRef.delete();

    return NextResponse.json(
      { message: `Tanda ${tandaId} deleted successfully.` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting tanda:', error);
    return NextResponse.json(
      { message: 'Failed to delete tanda.', error: error.message },
      { status: 500 }
    );
  }
}
