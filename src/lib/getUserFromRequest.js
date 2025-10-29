import { cookies } from 'next/headers';
import { getAuth } from '@/lib/firebaseAdmin.server.js';

/**
 * Attempts to resolve the authenticated user from the request cookies.
 * Falls back to the Next.js request cookie store when the request object
 * is not provided (e.g. server components).
 */
export async function getUserFromRequest(request) {
  try {
    const cookieStore = request?.cookies ?? cookies();
    const sessionCookie =
      cookieStore.get('__Host-__session')?.value ||
      cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return null;
    }

    return await getAuth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    console.error('[getUserFromRequest] Failed to verify session cookie', error);
    return null;
  }
}
