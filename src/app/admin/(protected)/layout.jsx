// ANCHOR: admin-protected-layout (BEGIN)
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionCookie } from '@/lib/firebaseAdmin.server';

// This layout protects everything under /admin/(protected)/**
export default async function AdminProtectedLayout({ children }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;

  if (!session) {
    // not signed in -> send to dedicated admin login
    redirect('/admin/login?next=/admin');
  }

  try {
    // verify signature/expiry
    const decoded = await verifySessionCookie(session);

    // OPTIONAL: enforce admin-only access later:
    // if (!decoded.admin) redirect('/admin/login?reason=forbidden');

    return <>{children}</>;
  } catch {
    // invalid/expired -> re-login
    redirect('/admin/login?next=/admin&reason=expired');
  }
}
// ANCHOR: admin-protected-layout (END)
