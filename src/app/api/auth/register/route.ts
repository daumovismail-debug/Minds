import { NextResponse } from 'next/server';
import { createSession, setSessionCookie } from '@/lib/auth';
import { createUser, findUserByEmail, validateEmail, validatePassword } from '@/lib/users';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const emailErr = validateEmail(body.email);
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

  const pwErr = validatePassword(body.password);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  const existing = await findUserByEmail(body.email);
  if (existing) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 });
  }

  const user = await createUser(body.email, body.password);
  const token = await createSession({ userId: user.id, email: user.email });
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } }, { status: 201 });
}
