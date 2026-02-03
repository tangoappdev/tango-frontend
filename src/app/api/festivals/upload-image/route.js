import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/firebaseAdmin.server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
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

function guessExtension(contentType, filename) {
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  const match = filename?.match(/\.(jpg|jpeg|png|webp)$/i);
  if (match) return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  return 'jpg';
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || 'image/jpeg';
    const ext = guessExtension(contentType, file.name);
    const hash = crypto
      .createHash('sha1')
      .update(`${Date.now()}-${file.name}-${buffer.length}`)
      .digest('hex');
    const filePath = `festivals/manual/${hash}.${ext}`;

    const bucket = getStorage().bucket();
    const storageFile = bucket.file(filePath);
    await storageFile.save(buffer, {
      contentType,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    const [signedUrl] = await storageFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ ok: true, imageUrl: signedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
