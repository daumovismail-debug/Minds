'use client';

import { useState } from 'react';
import { isQuestion } from '@/lib/classify';
import type { ThoughtItem } from './ThoughtCard';

type Mode = 'auto' | 'thought' | 'question';

type Source = {
  id: number;
  content: string;
  created_at: string;
  similarity: number;
};

type DuplicateInfo = {
  similar: Array<ThoughtItem & { similarity: number }>;
  threshold: number;
};

type AnswerState = {
  question: string;
  answer: string;
  sources: Source[];
};

type Props = {
  onThoughtAdded: (t: ThoughtItem) => void;
};

export function SmartInput({ onThoughtAdded }: Props) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('auto');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  const detected: 'thought' | 'question' =
    mode !== 'auto' ? mode : isQuestion(text) ? 'question' : 'thought';

  async function submit(force = false) {
    const t = text.trim();
    if (!t || loading) return;
    setLoading(true);
    setDuplicate(null);
    if (!force) setAnswer(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, mode, force }),
      });

      if (res.status === 409) {
        const data = await res.json();
        setDuplicate({ similar: data.similar, threshold: data.threshold });
        return;
      }

      if (!res.ok) return;

      const data = await res.json();
      if (data.intent === 'thought') {
        onThoughtAdded(data.thought);
        setText('');
        setMode('auto');
      } else if (data.intent === 'question') {
        setAnswer({ question: t, answer: data.answer, sources: data.sources ?? [] });
      }
    } finally {
      setLoading(false);
    }
  }

  const placeholder = 'Запиши мысль или задай вопрос…';

  return (
    <div className="card border-white/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setMode('auto')}
            className={`px-2 py-1 rounded-md transition-colors ${
              mode === 'auto' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            авто
          </button>
          <button
            onClick={() => setMode('thought')}
            className={`px-2 py-1 rounded-md transition-colors ${
              mode === 'thought' ? 'bg-accent/20 text-accent-soft' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            💭 мысль
          </button>
          <button
            onClick={() => setMode('question')}
            className={`px-2 py-1 rounded-md transition-colors ${
              mode === 'question' ? 'bg-accent/20 text-accent-soft' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            ❓ вопрос
          </button>
        </div>
        {text.trim().length > 0 && (
          <div className="text-xs text-ink-400 animate-fade-in">
            {detected === 'question' ? 'спрошу у твоих записей' : 'сохраню как мысль'}
          </div>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="input min-h-[110px] resize-y text-base"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />

      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-ink-500">Ctrl/⌘ + Enter</div>
        <button
          className="btn-primary"
          onClick={() => submit(false)}
          disabled={loading || !text.trim()}
        >
          {loading
            ? detected === 'question'
              ? 'Думаю…'
              : 'Сохранение…'
            : detected === 'question'
              ? 'Спросить'
              : 'Сохранить'}
        </button>
      </div>

      {duplicate && (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 animate-slide-up">
          <div className="text-amber-200 text-sm font-medium">
            Похоже, эта мысль уже записана
          </div>
          <div className="mt-2 space-y-2">
            {duplicate.similar.map((s) => (
              <div key={s.id} className="text-sm text-ink-100">
                <span className="text-ink-400 text-xs mr-2">
                  {new Date(s.created_at).toLocaleDateString('ru-RU')} ·{' '}
                  {(s.similarity * 100).toFixed(0)}%
                </span>
                {s.content}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button className="btn-ghost text-xs" onClick={() => setDuplicate(null)}>
              Отмена
            </button>
            <button className="btn-primary text-xs" onClick={() => submit(true)} disabled={loading}>
              Всё равно сохранить
            </button>
          </div>
        </div>
      )}

      {answer && (
        <div className="mt-4 animate-slide-up">
          <div className="text-xs text-ink-400 mb-1">Вопрос: {answer.question}</div>
          <div className="rounded-lg bg-ink-800/60 border border-white/5 p-4 whitespace-pre-wrap leading-relaxed">
            {answer.answer}
          </div>
          {answer.sources.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-ink-400 mb-1">Источники из твоих записей:</div>
              <div className="space-y-1">
                {answer.sources.map((s) => (
                  <div key={s.id} className="text-xs text-ink-300">
                    <span className="text-ink-500">
                      #{s.id} · {new Date(s.created_at).toLocaleDateString('ru-RU')} ·{' '}
                      {(s.similarity * 100).toFixed(0)}%
                    </span>{' '}
                    — {s.content.slice(0, 140)}
                    {s.content.length > 140 ? '…' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 flex justify-end">
            <button className="btn-ghost text-xs" onClick={() => setAnswer(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
