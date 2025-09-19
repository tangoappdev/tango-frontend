import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebaseAdmin.server';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    await getAuth().getUserByEmail(email);
    
    // If the line above does not throw an error, it means the user exists.
    return NextResponse.json({ exists: true });

  } catch (error) {
    // Check for the specific "user not found" error code from Firebase
    if (error.code === 'auth/user-not-found') {
      // This is the successful outcome for a new user, it means the email is available.
      return NextResponse.json({ exists: false });
    }
    
    // For any other unexpected errors, return a server error.
    console.error('Error checking email:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}