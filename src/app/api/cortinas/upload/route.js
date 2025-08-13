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
        // --- UPDATED: Added 'genre' to the expected data ---
        const { title, fileName, genre } = await request.json();

        // --- UPDATED: Added validation for 'genre' ---
        if (!title || !fileName || !genre) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const db = getFirestore();
        
        // 1. Prepare the new file path and the document for Firestore.
        const newFilePath = `cortinas/${uuidv4()}-${fileName}`;
        const newCortinaDocument = {
            title: title,
            url: newFilePath,
            // --- UPDATED: Added genre to the document ---
            genre: genre,
            createdAt: new Date().toISOString(),
        };

        // 2. Save the new cortina's data to the 'cortinas' collection.
        const docRef = await db.collection('cortinas').add(newCortinaDocument);

        // 3. Generate a secure URL for the client to upload the audio file.
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
