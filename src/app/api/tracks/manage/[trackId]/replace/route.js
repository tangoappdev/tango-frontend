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

// This API handles replacing a single track file.
export async function POST(request, { params }) {
    try {
        const { trackId } = params;
        const { newFileName } = await request.json();

        if (!trackId || !newFileName) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const [tandaId, trackIndexStr] = trackId.split('-');
        const trackIndex = parseInt(trackIndexStr, 10);

        const db = getFirestore();
        const storage = getStorage();
        const tandaRef = db.collection('tandas').doc(tandaId);
        const doc = await tandaRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'Parent tanda not found.' }, { status: 404 });
        }

        const tandaData = doc.data();
        let tracks = tandaData.tracks;

        if (isNaN(trackIndex) || trackIndex < 0 || trackIndex >= tracks.length) {
            return NextResponse.json({ message: 'Invalid track index.' }, { status: 400 });
        }

        // 1. Get the old file path and delete the old file from Storage.
        const oldTrack = tracks[trackIndex];
        const oldFilePath = oldTrack.url || oldTrack.filePath;
        if (oldFilePath) {
            await storage.bucket().file(oldFilePath).delete().catch(err => {
                console.error(`Old file ${oldFilePath} not found, continuing...`, err.message);
            });
        }

        // 2. Create a new path for the new file and update the database.
        const newFilePath = `tracks/${uuidv4()}-${newFileName}`;
        tracks[trackIndex].url = newFilePath;
        // Also update the format if it exists
        if (tracks[trackIndex].format) {
            tracks[trackIndex].format = newFileName.split('.').pop().toUpperCase();
        }
        await tandaRef.update({ tracks: tracks });

        // 3. Generate and return a secure URL for the client to upload the new file.
        const uploadUrl = await generateV4WriteSignedUrl(newFilePath);

        if (!uploadUrl) {
            throw new Error('Could not generate upload URL.');
        }

        return NextResponse.json({ uploadUrl, newFilePath });

    } catch (error) {
        console.error('Error replacing track file:', error);
        return NextResponse.json({ message: 'Failed to replace track file.', error: error.message }, { status: 500 });
    }
}
