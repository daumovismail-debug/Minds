import { NextResponse } from 'next/server';
import { q, toVectorLiteral } from '@/lib/db';
import { embed } from '@/lib/embeddings';
import { getCurrentSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { userId } = session;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  await q(`DELETE FROM thoughts WHERE id = $1 AND user_id = $2`, [id, userId]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { userId } = session;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  // Toggle done
  if (typeof body.done === 'boolean' && body.content === undefined) {
    const { rows } = await q(
      `UPDATE thoughts SET done = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING id, content, tags, kind, done, due_at, created_at, updated_at`,
      [body.done, id, userId],
    );
    if (rows.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ item: rows[0] });
  }

  // Edit content (regenerate embedding)
  if (typeof body.content === 'string' && body.content.trim()) {
    const content = body.content.trim();
    const tags: string[] = Array.isArray(body.tags)
      ? body.tags
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];

    const embedding = await embed(content);
    const vec = toVectorLiteral(embedding);

    const { rows } = await q(
      `UPDATE thoughts
          SET content = $1, tags = $2, embedding = $3::vector, updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING id, content, tags, kind, done, due_at, created_at, updated_at`,
      [content, tags, vec, id, userId],
    );

    if (rows.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ item: rows[0] });
  }

  return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
}
