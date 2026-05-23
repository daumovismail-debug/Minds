import { NextResponse } from 'next/server';
import { pool, toVectorLiteral } from '@/lib/db';
import { answerFromThoughts, embedQuery } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.question !== 'string' || !body.question.trim()) {
    return NextResponse.json({ error: 'question_required' }, { status: 400 });
  }
  const question = body.question.trim();

  const queryEmbedding = await embedQuery(question);
  const vec = toVectorLiteral(queryEmbedding);

  const { rows: thoughts } = await pool.query(
    `SELECT id, content, created_at,
            1 - (embedding <=> $1::vector) AS similarity
       FROM thoughts
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 5`,
    [vec],
  );

  const relevant = thoughts.filter((t) => Number(t.similarity) >= 0.45);

  const answer = await answerFromThoughts({
    question,
    thoughts: relevant.map((t) => ({
      id: t.id,
      content: t.content,
      created_at: t.created_at,
      similarity: Number(t.similarity),
    })),
  });

  return NextResponse.json({
    answer,
    sources: relevant.map((t) => ({
      id: t.id,
      content: t.content,
      created_at: t.created_at,
      similarity: Number(t.similarity),
    })),
  });
}
