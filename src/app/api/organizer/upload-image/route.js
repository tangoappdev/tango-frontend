import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/firebaseAdmin.server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

function guessExtension(contentType, filename) {
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  const match = filename?.match(/\.(jpg|jpeg|png|webp)$/i);
  if (match) return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  return 'jpg';
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user?.email_verified) {
    return NextResponse.json(
      { error: 'Verify your email before uploading images.' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || 'image/jpeg';
    const ext = guessExtension(contentType, file.name);
    const hash = crypto
      .createHash('sha1')
      .update(`${user.uid}-${Date.now()}-${file.name}-${buffer.length}`)
      .digest('hex');
    const filePath = `organizer/uploads/${user.uid}/${hash}.${ext}`;

    const bucket = getStorage().bucket();
    const storageFile = bucket.file(filePath);
    const downloadToken = crypto.randomUUID();
    await storageFile.save(buffer, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(filePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ ok: true, imageUrl: url });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
