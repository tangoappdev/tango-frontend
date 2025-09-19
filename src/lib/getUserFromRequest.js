import { cookies as nextCookies } from 'next/headers';
import { getAuth } from '@/lib/firebaseAdmin.server.js';

export async function getUserFromRequest(_request) {
  try {
    const jar = await nextCookies();
    const sessionCookie =
      jar.get('__Host-__session')?.value || jar.get('__session')?.value;

    if (!sessionCookie) return null;

    const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
    return decoded;
  } catch {
    return null;
  }
}