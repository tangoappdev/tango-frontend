import { NextResponse } from 'next/server';
import { getAuth, getFirestore } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { sendVerificationTemplateEmail } from '@/lib/sendEmail';

function parseIsoDate(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export async function POST(request) {
  const decoded = await getUserFromRequest(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = getAuth();
    const db = getFirestore();

    const userRecord = await auth.getUser(decoded.uid);
    if (!userRecord.email) {
      return NextResponse.json({ error: 'Missing email address' }, { status: 400 });
    }
    if (userRecord.emailVerified) {
      return NextResponse.json({ alreadyVerified: true }, { status: 200 });
    }

    const userRef = db.collection('users').doc(decoded.uid);
    const userSnapshot = await userRef.get();
    const profileData = userSnapshot.exists ? userSnapshot.data() : {};
    const lastSentAt = parseIsoDate(profileData?.emailVerificationLastSentAt);
    const now = Date.now();
    if (lastSentAt && now - lastSentAt < 60_000) {
      const retryAfter = Math.ceil((60_000 - (now - lastSentAt)) / 1000);
      return NextResponse.json(
        { error: 'Verification email recently sent. Please wait before trying again.', retryAfter },
        { status: 429 },
      );
    }

    const continueUrl =
      process.env.FIREBASE_WEB_ACTION_URL ||
      process.env.EMAIL_VERIFICATION_CONTINUE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://virtualtangodj.com';

    const actionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: false,
    };

    const verificationLink = await auth.generateEmailVerificationLink(userRecord.email, actionCodeSettings);

    await sendVerificationTemplateEmail({
      to: userRecord.email,
      dynamicTemplateData: {
        firstName: userRecord.displayName || 'there',
        verificationLink,
        recipientEmail: userRecord.email,
      },
    });

    await userRef.set(
      {
        emailVerificationLastSentAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[auth/send-verification] error', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}
