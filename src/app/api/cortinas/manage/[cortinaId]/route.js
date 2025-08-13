import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server.js';

// This API route handles updating a single cortina's details.
export async function PUT(request, { params }) {
  try {
    const { cortinaId } = params;
    const { title, artist, genre } = await request.json();

    if (!cortinaId || !title || !genre) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const db = getFirestore();
    const cortinaRef = db.collection('cortinas').doc(cortinaId);
    
    // Prepare the fields to update
    const fieldsToUpdate = {
      title,
      artist: artist || '', // Save artist or empty string
      genre,
    };

    // Save the updated data to the document
    await cortinaRef.update(fieldsToUpdate);

    return NextResponse.json({ message: 'Cortina updated successfully.' });

  } catch (error) {
    console.error(`Error updating cortina ${params.cortinaId}:`, error);
    return NextResponse.json({ message: 'Failed to update cortina.', error: error.message }, { status: 500 });
  }
}
