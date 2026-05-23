import { NextResponse } from 'next/server';
import { createSession, setSessionCookie } from '@/lib/auth';
import { findUserByEmail, verifyPassword } from '@/lib/users';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const user = await findUserByEmail(body.email);
  if (!user) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const ok = await verifyPassword(body.password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const token = await createSession({ userId: user.id, email: user.email });
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
