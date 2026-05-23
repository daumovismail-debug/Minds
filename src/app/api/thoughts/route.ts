import { NextResponse } from 'next/server';
import { pool, toVectorLiteral, type Thought } from '@/lib/db';
import { embed } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();

  if (q && q.length > 0) {
    const queryEmbedding = await embed(q);
    const vec = toVectorLiteral(queryEmbedding);
    const { rows } = await pool.query(
      `SELECT id, content, tags, created_at, updated_at,
              1 - (embedding <=> $1::vector) AS similarity
         FROM thoughts
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 50`,
      [vec],
    );
    return NextResponse.json({ thoughts: rows });
  }

  const { rows } = await pool.query<Thought>(
    `SELECT id, content, tags, created_at, updated_at
       FROM thoughts
      ORDER BY created_at DESC
      LIMIT 200`,
  );
  return NextResponse.json({ thoughts: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== 'string' || !body.content.trim()) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  const content = body.content.trim();
  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === 'string').map((t: string) => t.trim()).filter(Boolean)
    : [];
  const force: boolean = body.force === true;

  const embedding = await embed(content);
  const vec = toVectorLiteral(embedding);

  const threshold = Number(process.env.DUPLICATE_THRESHOLD ?? '0.85');

  if (!force) {
    const { rows: similar } = await pool.query(
      `SELECT id, content, tags, created_at, updated_at,
              1 - (embedding <=> $1::vector) AS similarity
         FROM thoughts
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 3`,
      [vec],
    );
    const top = similar[0];
    if (top && Number(top.similarity) >= threshold) {
      return NextResponse.json(
        {
          duplicate: true,
          threshold,
          similar: similar.filter((s) => Number(s.similarity) >= threshold * 0.9),
        },
        { status: 409 },
      );
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO thoughts (content, tags, embedding)
     VALUES ($1, $2, $3::vector)
     RETURNING id, content, tags, created_at, updated_at`,
    [content, tags, vec],
  );

  return NextResponse.json({ thought: rows[0] }, { status: 201 });
}
