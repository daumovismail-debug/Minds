import { NextResponse } from 'next/server';
import { pool, toVectorLiteral } from '@/lib/db';
import { embed } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  await pool.query(`DELETE FROM thoughts WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== 'string' || !body.content.trim()) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  const content = body.content.trim();
  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === 'string').map((t: string) => t.trim()).filter(Boolean)
    : [];

  const embedding = await embed(content);
  const vec = toVectorLiteral(embedding);

  const { rows } = await pool.query(
    `UPDATE thoughts
        SET content = $1,
            tags = $2,
            embedding = $3::vector,
            updated_at = NOW()
      WHERE id = $4
      RETURNING id, content, tags, created_at, updated_at`,
    [content, tags, vec, id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ thought: rows[0] });
}
