import { NextResponse } from 'next/server';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.login !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const expectedLogin = process.env.ADMIN_LOGIN ?? 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  if (body.login !== expectedLogin || body.password !== expectedPassword) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const token = await createSession(body.login);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
