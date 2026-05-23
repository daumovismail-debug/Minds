import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'minds_session';
const SESSION_TTL = '30d';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET is not set or too short');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(login: string): Promise<string> {
  return new SignJWT({ login })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined): Promise<{ login: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.login === 'string') {
      return { login: payload.login };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
