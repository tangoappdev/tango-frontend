// src/middleware.js (or middleware.js at project root)
import { NextResponse } from 'next/server';

// Protect only admin routes
export const config = {
  matcher: [
    '/',
    '/home',
    /*
     * Match all request paths under /admin/
     * except for the /admin/login page itself.
     */
    '/admin/:path((?!login$).*)',
    // Add API routes that need protection
    '/api/(dashboard|tandas/manage)(/:path*)',
  ],
};

export default function middleware(req) {
  const host = (req.headers.get('host') || '').toLowerCase();
  const pathname = req.nextUrl.pathname;

  if (pathname === '/' && (host === 'tangoapp.ar' || host === 'www.tangoapp.ar')) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  const session = req.cookies.get('__session')?.value;

  // Not logged in? -> send to /login and remember where they wanted to go
  if (!session) {
    const url = new URL('/admin/login', req.url);
    const dest = req.nextUrl.pathname + req.nextUrl.search;
    url.searchParams.set('redirect', dest);
    return NextResponse.redirect(url);
  }

  // Session cookie present; let server-side verify claims on APIs
  return NextResponse.next();
}
