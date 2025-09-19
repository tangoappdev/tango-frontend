// src/app/api/admin/users/list/route.js
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from '@/lib/firebaseAdmin.server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

// ---------- Admin guard ----------
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
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

// --- Main Handler ---
export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const pageToken = searchParams.get('pageToken') || undefined;
    const query = searchParams.get('q')?.toLowerCase() || '';

    const auth = getAuth();
    const db = getFirestore();

    // 1. Fetch users from Firebase Auth
    const listUsersResult = await auth.listUsers(pageSize, pageToken);

    // 2. Fetch corresponding profiles from Firestore
    const uids = listUsersResult.users.map(u => u.uid);
    const profileDocs = uids.length ? await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', uids).get() : [];
    const profilesByUid = {};
    profileDocs.forEach(doc => {
      profilesByUid[doc.id] = doc.data();
    });

    // 3. Merge Auth data with Firestore data
    let mergedUsers = listUsersResult.users.map(authUser => {
      const profile = profilesByUid[authUser.uid] || {};
      const now = Date.now();
      const trialEndsAt = profile.trialEndsAt ? new Date(profile.trialEndsAt).getTime() : 0;
      const trialActive = trialEndsAt > now;
      const isPro = profile.status === 'active' || profile.plan === 'pro';

      let tier = 'free';
      if (isPro) tier = 'pro';
      else if (trialActive) tier = 'trial';

      return {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        disabled: authUser.disabled,
        createdAt: authUser.metadata.creationTime,
        lastSignInTime: authUser.metadata.lastSignInTime,
        // From Firestore profile
        plan: profile.plan || null,
        status: profile.status || null,
        trialEndsAt: profile.trialEndsAt || null,
        manual: profile.manual || null,
        // Derived
        tier,
      };
    });

    // 4. Apply search filter if query exists
    if (query) {
      mergedUsers = mergedUsers.filter(u => 
        u.displayName?.toLowerCase().includes(query) || 
        u.email?.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      users: mergedUsers,
      nextPageToken: listUsersResult.pageToken,
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}