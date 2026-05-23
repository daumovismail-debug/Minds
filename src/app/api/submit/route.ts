import { NextResponse } from 'next/server';
import { pool, toVectorLiteral } from '@/lib/db';
import { embed, embedQuery } from '@/lib/embeddings';
import { answerFromThoughts } from '@/lib/llm';
import { getCurrentSession } from '@/lib/auth';
import { resolveIntent, type IntentMode } from '@/lib/classify';

export const dynamic = 'force-dynamic';

function llmErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/COHERE_API_KEY/i.test(msg)) return 'Cohere API ключ не настроен (COHERE_API_KEY в .env)';
  if (/GROQ_API_KEY/i.test(msg)) return 'Groq API ключ не настроен (GROQ_API_KEY в .env)';
  if (/Cohere 401|Cohere 403/i.test(msg)) return 'Cohere API ключ неверный или истёк';
  if (/Groq 401|Groq 403/i.test(msg)) return 'Groq API ключ неверный или истёк';
  if (/Cohere 429|Groq 429/i.test(msg)) return 'Превышен лимит — подожди минуту';
  if (/network|fetch|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg))
    return 'Сеть не отвечает. Сервер не может достучаться до Groq/Cohere';
  return `Ошибка ИИ: ${msg}`;
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.userId;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== 'string' || !body.text.trim()) {
    return NextResponse.json({ error: 'text_required' }, { status: 400 });
  }

  const text = body.text.trim();
  const mode: IntentMode = body.mode === 'thought' || body.mode === 'question' ? body.mode : 'auto';
  const intent = resolveIntent(text, mode);
  const force: boolean = body.force === true;

  if (intent === 'question') {
    try {
      const queryEmbedding = await embedQuery(text);
      const vec = toVectorLiteral(queryEmbedding);
      const { rows: thoughts } = await pool.query(
        `SELECT id, content, created_at,
                1 - (embedding <=> $1::vector) AS similarity
           FROM thoughts
          WHERE user_id = $2 AND embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector
          LIMIT 5`,
        [vec, userId],
      );
      const relevant = thoughts.filter((t) => Number(t.similarity) >= 0.35);
      const answer = await answerFromThoughts({
        question: text,
        thoughts: relevant.map((t) => ({
          id: t.id,
          content: t.content,
          created_at: t.created_at,
          similarity: Number(t.similarity),
        })),
      });
      return NextResponse.json({
        intent: 'question',
        answer,
        sources: relevant.map((t) => ({
          id: t.id,
          content: t.content,
          created_at: t.created_at,
          similarity: Number(t.similarity),
        })),
      });
    } catch (e) {
      console.error('submit question error:', e);
      return NextResponse.json({ intent: 'question', error: llmErrorMessage(e) }, { status: 502 });
    }
  }

  // intent === 'thought'
  const tags: string[] = Array.isArray(body.tags)
    ? body.tags
        .filter((t: unknown): t is string => typeof t === 'string')
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];

  let embedding: number[];
  try {
    embedding = await embed(text);
  } catch (e) {
    console.error('submit thought embed error:', e);
    return NextResponse.json({ intent: 'thought', error: llmErrorMessage(e) }, { status: 502 });
  }
  const vec = toVectorLiteral(embedding);

  const threshold = Number(process.env.DUPLICATE_THRESHOLD ?? '0.85');

  if (!force) {
    const { rows: similar } = await pool.query(
      `SELECT id, content, tags, created_at, updated_at,
              1 - (embedding <=> $1::vector) AS similarity
         FROM thoughts
        WHERE user_id = $2 AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 3`,
      [vec, userId],
    );
    const top = similar[0];
    if (top && Number(top.similarity) >= threshold) {
      return NextResponse.json(
        {
          intent: 'thought',
          duplicate: true,
          threshold,
          similar: similar.filter((s) => Number(s.similarity) >= threshold * 0.9),
        },
        { status: 409 },
      );
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO thoughts (user_id, content, tags, embedding)
     VALUES ($1, $2, $3, $4::vector)
     RETURNING id, content, tags, created_at, updated_at`,
    [userId, text, tags, vec],
  );

  return NextResponse.json({ intent: 'thought', thought: rows[0] }, { status: 201 });
}
