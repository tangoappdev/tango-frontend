import { NextResponse } from 'next/server';
import { getFirestore, getStorage, getAuth } from '@/lib/firebaseAdmin.server.js';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(userRecord, decodedToken) {
  if (userRecord?.customClaims?.admin === true || decodedToken?.admin === true) {
    return true;
  }
  const email = (userRecord?.email || decodedToken?.email || '').toLowerCase();
  return ADMIN_EMAILS.includes(email);
}

async function generateV4ReadSignedUrl(filePath) {
  if (!filePath) return null;
  try {
    const [url] = await getStorage()
      .bucket()
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });
    return url;
  } catch (error) {
    console.error(`Failed to generate signed URL for ${filePath}.`, error);
    return null;
  }
}

async function verifyAdmin(request) {
  const decoded = await getUserFromRequest(request);
  if (!decoded) {
    return null;
  }

  try {
    const userRecord = await getAuth().getUser(decoded.uid);
    if (isAdmin(userRecord, decoded)) {
      return userRecord;
    }
  } catch (error) {
    console.error('Error verifying admin status:', error);
  }

  return isAdmin(null, decoded) ? decoded : null;
}

// GET all cortinas for the admin panel
export async function GET(request) {
  const adminUser = await verifyAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getFirestore();
    const snapshot = await db.collection('cortinas').get();
    const cortinas = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const filePath = data.url || data.filePath;
      const playableUrl = await generateV4ReadSignedUrl(filePath);
      return {
        id: doc.id,
        ...data,
        playableUrl,
      };
    }));
    return NextResponse.json({ cortinas });
  } catch (error) {
    console.error('Error fetching cortinas for management:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// UPDATE a cortina
export async function PUT(request) {
  const adminUser = await verifyAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ message: 'Cortina ID is required' }, { status: 400 });
  }

  try {
    const db = getFirestore();
    const body = await request.json();
    
    // Sanitize data: ensure numeric fields are numbers or null
    const dataToUpdate = { ...body };
    if (dataToUpdate.hasOwnProperty('startTime')) {
        dataToUpdate.startTime = dataToUpdate.startTime === null ? null : Number(dataToUpdate.startTime);
    }
    if (dataToUpdate.hasOwnProperty('endTime')) {
        dataToUpdate.endTime = dataToUpdate.endTime === null ? null : Number(dataToUpdate.endTime);
    }

    await db.collection('cortinas').doc(id).update(dataToUpdate);
    return NextResponse.json({ message: 'Cortina updated successfully' });
  } catch (error) {
    console.error(`Error updating cortina ${id}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a cortina
export async function DELETE(request) {
  const adminUser = await verifyAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ message: 'Cortina ID is required' }, { status: 400 });
  }

  try {
    const db = getFirestore();
    await db.collection('cortinas').doc(id).delete();
    // Note: This does not delete the file from Firebase Storage.
    return NextResponse.json({ message: 'Cortina deleted successfully' });
  } catch (error) {
    console.error(`Error deleting cortina ${id}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

