import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public paths
  if (
    pathname.startsWith('/api/') || 
    pathname === '/login' || 
    pathname.startsWith('/_next/') || 
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('vantage_session');
  
  if (!sessionCookie) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    
    // Root redirect
    if (pathname === '/') {
      return NextResponse.redirect(new URL(session.role === 'rm' ? '/rm' : '/client', request.url));
    }

    // Role-based route protection
    if (pathname.startsWith('/rm') && session.role !== 'rm') {
      return NextResponse.redirect(new URL('/client', request.url));
    }
    
    if (pathname.startsWith('/client') && session.role !== 'client') {
      return NextResponse.redirect(new URL('/rm', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
