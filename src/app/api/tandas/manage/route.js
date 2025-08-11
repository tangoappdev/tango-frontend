import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';

// This API route fetches all tandas from the database for management purposes.
export async function GET() {
  try {
    const db = getFirestore();
    const tandasRef = db.collection('tandas');
    
    // We order by 'createdAt' in descending order to show the newest tandas first.
    const snapshot = await tandasRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return NextResponse.json({ tandas: [] }, { status: 200 });
    }

    const tandas = snapshot.docs.map(doc => ({
      id: doc.id, // Include the unique document ID
      ...doc.data(),
    }));

    return NextResponse.json({ tandas });

  } catch (error) {
    console.error('Error fetching tandas for management:', error);
    return NextResponse.json({ message: 'Failed to fetch tandas.', error: error.message }, { status: 500 });
  }
}
