import { NextResponse } from 'next/server';
import { q, toVectorLiteral } from '@/lib/db';
import { embed, embedQuery } from '@/lib/embeddings';
import { answerFromThoughts } from '@/lib/llm';
import { getCurrentSession } from '@/lib/auth';
import { classify, isUrgent } from '@/lib/classify';
import { parseListQuery } from '@/lib/list-parser';

export const dynamic = 'force-dynamic';

function llmErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/COHERE_API_KEY/i.test(msg)) return 'Cohere API ключ не настроен';
  if (/GROQ_API_KEY/i.test(msg)) return 'Groq API ключ не настроен';
  if (/Cohere 401|Cohere 403/i.test(msg)) return 'Cohere API ключ неверный или истёк';
  if (/Groq 401|Groq 403/i.test(msg)) return 'Groq API ключ неверный или истёк';
  if (/Cohere 429|Groq 429/i.test(msg)) return 'Превышен лимит — подожди минуту';
  if (/network|fetch|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg))
    return 'Сеть не отвечает. Сервер не может достучаться до ИИ';
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
  const manualMode = body.mode;
  const intent =
    manualMode === 'thought' || manualMode === 'question' || manualMode === 'task' || manualMode === 'list'
      ? manualMode
      : classify(text);
  const force: boolean = body.force === true;

  if (intent === 'list') {
    const lq = parseListQuery(text);
    const conditions: string[] = ['user_id = $1'];
    const params: unknown[] = [userId];

    if (lq.kind !== 'all') {
      params.push(lq.kind);
      conditions.push(`kind = $${params.length}`);
    }
    if (lq.urgent) {
      conditions.push(`urgent = TRUE`);
    }
    if (lq.done !== undefined) {
      params.push(lq.done);
      conditions.push(`done = $${params.length}`);
    }
    if (lq.dateFrom) {
      params.push(lq.dateFrom.toISOString());
      conditions.push(`created_at >= $${params.length}`);
    }
    if (lq.dateTo) {
      params.push(lq.dateTo.toISOString());
      conditions.push(`created_at < $${params.length}`);
    }

    const sql = `SELECT id, content, tags, kind, done, urgent, due_at, created_at, updated_at
                   FROM thoughts
                  WHERE ${conditions.join(' AND ')}
                  ORDER BY urgent DESC, done ASC, created_at DESC
                  LIMIT 100`;
    const { rows } = await q(sql, params);

    return NextResponse.json({
      intent: 'list',
      query: { description: lq.description },
      items: rows,
    });
  }

  if (intent === 'question') {
    try {
      const queryEmbedding = await embedQuery(text);
      const vec = toVectorLiteral(queryEmbedding);
      const { rows: items } = await q(
        `SELECT id, content, kind, done, created_at,
                1 - (embedding <=> $1::vector) AS similarity
           FROM thoughts
          WHERE user_id = $2 AND kind = 'thought' AND embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector
          LIMIT 6`,
        [vec, userId],
      );
      const relevant = items
        .filter((t) => Number(t.similarity) >= 0.3)
        .map((t) => ({
          id: t.id as number,
          content: t.content as string,
          created_at: t.created_at as string,
          similarity: Number(t.similarity),
        }));
      const answer = await answerFromThoughts({ question: text, thoughts: relevant });
      return NextResponse.json({
        intent: 'question',
        answer,
        sources: relevant,
      });
    } catch (e) {
      console.error('submit question error:', e);
      return NextResponse.json({ intent: 'question', error: llmErrorMessage(e) }, { status: 502 });
    }
  }

  let embedding: number[];
  try {
    embedding = await embed(text);
  } catch (e) {
    console.error('submit embed error:', e);
    return NextResponse.json({ intent, error: llmErrorMessage(e) }, { status: 502 });
  }
  const vec = toVectorLiteral(embedding);

  if (intent === 'thought' && !force) {
    const threshold = Number(process.env.DUPLICATE_THRESHOLD ?? '0.85');
    const { rows: similar } = await q(
      `SELECT id, content, tags, kind, done, urgent, due_at, created_at, updated_at,
              1 - (embedding <=> $1::vector) AS similarity
         FROM thoughts
        WHERE user_id = $2 AND kind = 'thought' AND embedding IS NOT NULL
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

  const urgent = intent === 'task' && isUrgent(text);

  const { rows } = await q(
    `INSERT INTO thoughts (user_id, content, kind, urgent, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)
     RETURNING id, content, tags, kind, done, urgent, due_at, created_at, updated_at`,
    [userId, text, intent, urgent, vec],
  );

  return NextResponse.json({ intent, thought: rows[0] }, { status: 201 });
}
