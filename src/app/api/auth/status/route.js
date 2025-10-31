import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function GET(request) {
  const decoded = await getUserFromRequest(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = getAuth();
    const userRecord = await auth.getUser(decoded.uid);

    return NextResponse.json({
      emailVerified: !!userRecord.emailVerified,
      uid: userRecord.uid,
      providerIds: userRecord.providerData?.map((p) => p.providerId) ?? [],
    });
  } catch (error) {
    console.error('[auth/status] error', error);
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
  }
}
