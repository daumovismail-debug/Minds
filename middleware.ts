import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'minds_session';

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (typeof payload.userId !== 'number') return false;
    if (typeof payload.email !== 'string') return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';
  const isAuthApi =
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/logout';
  const isPublicAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon');

  if (isLoginPage || isRegisterPage || isAuthApi || isPublicAsset) {
    return NextResponse.next();
  }

  const authed = await isAuthed(req);
  if (!authed) {
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      res.cookies.delete(COOKIE_NAME);
      return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    const res = NextResponse.redirect(url);
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
