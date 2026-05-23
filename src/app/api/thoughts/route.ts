import { NextResponse } from 'next/server';
import { q, toVectorLiteral, type Thought } from '@/lib/db';
import { embed } from '@/lib/embeddings';
import { getCurrentSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { userId } = session;

  const url = new URL(req.url);
  const search = url.searchParams.get('q')?.trim();

  if (search && search.length > 0) {
    const queryEmbedding = await embed(search);
    const vec = toVectorLiteral(queryEmbedding);
    const { rows } = await q(
      `SELECT id, content, tags, kind, done, urgent, due_at, created_at, updated_at,
              1 - (embedding <=> $1::vector) AS similarity
         FROM thoughts
        WHERE user_id = $2 AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 50`,
      [vec, userId],
    );
    return NextResponse.json({ items: rows });
  }

  const { rows } = await q<Thought>(
    `SELECT id, content, tags, kind, done, urgent, due_at, created_at, updated_at
       FROM thoughts
      WHERE user_id = $1
      ORDER BY done ASC, created_at DESC
      LIMIT 300`,
    [userId],
  );
  return NextResponse.json({ items: rows });
}
