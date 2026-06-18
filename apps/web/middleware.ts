import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/biblioteca'];

// Chequeo óptimista en el Edge runtime (sin Prisma): solo mira si existe la
// cookie de sesión. La validación real de la sesión la hace cada página server
// component con `auth()` (ver app/dashboard/page.tsx).
export function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSession =
    req.cookies.has('authjs.session-token') ||
    req.cookies.has('__Secure-authjs.session-token');

  if (!hasSession) {
    const signinUrl = new URL('/signin', origin);
    signinUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signinUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/biblioteca/:path*'],
};
