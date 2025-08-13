import { NextResponse } from 'next/server';
import { getFirestore, getStorage } from '@/lib/firebaseAdmin.server.js';
import { v4 as uuidv4 } from 'uuid';

// Helper function to generate a secure URL for uploading
async function generateV4WriteSignedUrl(filePath) {
    try {
        const options = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };
        const [url] = await getStorage().bucket().file(filePath).getSignedUrl(options);
        return url;
    } catch (error) {
        console.error(`Failed to generate write URL for ${filePath}`, error);
        return null;
    }
}

// This API handles creating a new cortina record and providing an upload URL.
export async function POST(request) {
    try {
        // --- THIS IS THE FIX: Correctly receive 'artist' from the body ---
        const { title, fileName, genre, artist } = await request.json();

        if (!title || !fileName || !genre) {
            return NextResponse.json({ message: 'Title, file name, and genre are required.' }, { status: 400 });
        }

        const db = getFirestore();
        
        const newFilePath = `cortinas/${uuidv4()}-${fileName}`;
        const newCortinaDocument = {
            title: title,
            url: newFilePath,
            genre: genre,
            // --- THIS IS THE FIX: Add the artist to the document ---
            artist: artist || '', // Save artist, or an empty string if not provided
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('cortinas').add(newCortinaDocument);

        const uploadUrl = await generateV4WriteSignedUrl(newFilePath);

        if (!uploadUrl) {
            throw new Error('Could not generate upload URL.');
        }

        return NextResponse.json({
            message: 'Cortina created successfully. Please upload the file.',
            uploadUrl: uploadUrl,
            cortinaId: docRef.id,
        });

    } catch (error) {
        console.error('Error creating cortina:', error);
        return NextResponse.json({ message: 'Failed to create cortina.', error: error.message }, { status: 500 });
    }
}
