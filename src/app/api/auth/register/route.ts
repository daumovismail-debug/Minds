import { NextResponse } from 'next/server';
import { createSession, setSessionCookie } from '@/lib/auth';
import { createUser, findUserByUsername, validatePassword, validateUsername } from '@/lib/users';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const uErr = validateUsername(body.username);
  if (uErr) return NextResponse.json({ error: uErr }, { status: 400 });

  const pErr = validatePassword(body.password);
  if (pErr) return NextResponse.json({ error: pErr }, { status: 400 });

  const existing = await findUserByUsername(body.username);
  if (existing) {
    return NextResponse.json({ error: 'username_taken' }, { status: 409 });
  }

  const user = await createUser(body.username, body.password);
  const token = await createSession({ userId: user.id, username: user.username });
  await setSessionCookie(token);
  return NextResponse.json(
    { ok: true, user: { id: user.id, username: user.username } },
    { status: 201 },
  );
}
