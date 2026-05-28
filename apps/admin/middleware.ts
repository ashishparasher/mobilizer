import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Allow login page and static assets
  if (path.startsWith('/login') || path.startsWith('/_next') || path === '/favicon.ico') {
    return NextResponse.next();
  }

  // Check for Supabase auth cookie
  const cookies = req.cookies.getAll();
  const hasAuthCookie = cookies.some(c => c.name.startsWith('sb-') && c.value);

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
