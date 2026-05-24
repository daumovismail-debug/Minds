import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { classifyIntent } from '@/lib/llm';
import { classify } from '@/lib/classify';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return NextResponse.json({ intent: 'thought' });

  try {
    const intent = await classifyIntent(text);
    return NextResponse.json({ intent });
  } catch (e) {
    console.warn('classify endpoint LLM failed, using heuristic:', e);
    return NextResponse.json({ intent: classify(text), fallback: true });
  }
}
