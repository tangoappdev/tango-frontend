import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getFirestore();
    const doc = await db.collection('users').doc(user.uid).get();
    const profile = doc.exists ? doc.data() : {};
    return NextResponse.json({
      ok: true,
      profile: {
        displayName: profile?.displayName || user.name || '',
        email: user.email || profile?.email || '',
        organizer: Boolean(profile?.organizer),
        teacher: Boolean(profile?.teacher),
        tangoDj: Boolean(profile?.tangoDj),
        photoURL: profile?.photoURL || '',
        emailVerified: Boolean(user?.email_verified),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { displayName, organizer, teacher, tangoDj, photoURL } = body || {};

    const updates = {};
    if (typeof displayName === 'string') updates.displayName = displayName.trim();
    const wantsRoles =
      (organizer === true) ||
      (teacher === true) ||
      (tangoDj === true);
    if (wantsRoles && !user?.email_verified) {
      return NextResponse.json(
        { error: 'Verify your email before enabling organizer/teacher/DJ roles.' },
        { status: 403 }
      );
    }
    if (typeof organizer === 'boolean') {
      if (organizer && !user?.email_verified) {
        return NextResponse.json(
          { error: 'Verify your email before becoming an organizer.' },
          { status: 403 }
        );
      }
      updates.organizer = organizer;
    }
    if (typeof teacher === 'boolean') updates.teacher = teacher;
    if (typeof tangoDj === 'boolean') updates.tangoDj = tangoDj;
    if (typeof photoURL === 'string') updates.photoURL = photoURL.trim();

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const db = getFirestore();
    await db.collection('users').doc(user.uid).set(updates, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
