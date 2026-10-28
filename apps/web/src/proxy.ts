import { NextResponse, type NextRequest } from 'next/server';
import { LOGIN_PATH, ROLE_HOME, SESSION_COOKIE, canAccess, decodeSession } from '@/features/auth/lib/session';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (pathname === LOGIN_PATH) {
    return session ? redirectTo(ROLE_HOME[session.role]) : NextResponse.next();
  }

  if (!session) {
    const url = new URL(LOGIN_PATH, request.url);
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (pathname === '/' || !canAccess(session.role, pathname)) {
    return redirectTo(ROLE_HOME[session.role]);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)'],
};