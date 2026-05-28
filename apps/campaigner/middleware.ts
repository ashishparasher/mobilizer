import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Paths requiring protection
  const isDashboardRoute =
    path === '/' ||
    path.startsWith('/campaigns') ||
    path.startsWith('/map') ||
    path.startsWith('/wallet') ||
    path.startsWith('/participants') ||
    path.startsWith('/settings');

  if (isDashboardRoute) {
    // Check for presence of Supabase auth cookie
    const cookies = req.cookies.getAll();
    const hasAuthCookie = cookies.some(c => c.name.startsWith('sb-') && c.value);

    if (!hasAuthCookie) {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
export default middleware;
