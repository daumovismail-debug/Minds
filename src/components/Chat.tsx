'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { classify, type Intent } from '@/lib/classify';
import { ArrowUpIcon, CheckIcon, SparkleIcon } from './icons';
import { ThoughtCard, type ThoughtItem } from './ThoughtCard';

type Mode = 'auto' | Intent;

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

type ListState = {
  query: string;
  description: string;
  items: ThoughtItem[];
};

const INTENT_LABEL: Record<Intent, { label: string; color: string }> = {
  thought: { label: 'мысль', color: 'text-accent-deep' },
  question: { label: 'вопрос', color: 'text-sky-600' },
  task: { label: 'задача', color: 'text-amber-600' },
  list: { label: 'список', color: 'text-emerald-700' },
};

const ACTION_LABEL: Record<Intent, string> = {
  thought: 'сохраню как мысль',
  question: 'найду ответ',
  task: 'добавлю в задачи',
  list: 'покажу выборку',
};

const MODE_CHIPS: Array<{ key: Mode; label: string; active: string }> = [
  { key: 'auto', label: 'авто', active: 'bg-paper-800 text-white' },
  { key: 'thought', label: '💭 мысль', active: 'bg-accent-tint text-accent-deep' },
  { key: 'task', label: '📋 задача', active: 'bg-amber-100 text-amber-700' },
  { key: 'question', label: '❓ вопрос', active: 'bg-sky-100 text-sky-700' },
];

export function Chat() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('auto');
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [llmDetected, setLlmDetected] = useState<Intent | null>(null);
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [list, setList] = useState<ListState | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastClassifiedRef = useRef<string>('');

  const hasResult = Boolean(answer || list || duplicate || error);
  const detected: Intent =
    mode !== 'auto' ? mode : llmDetected ?? (text.trim() ? classify(text) : 'thought');

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [text]);

  // saved flash
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  // debounced LLM classify
  useEffect(() => {
    const t = text.trim();
    if (mode !== 'auto' || !t || t.length < 2) {
      setLlmDetected(null);
      return;
    }
    if (t.endsWith('?')) {
      setLlmDetected('question');
      lastClassifiedRef.current = t;
      return;
    }
    if (lastClassifiedRef.current === t) return;
    const handle = setTimeout(async () => {
      setClassifying(true);
      try {
        const res = await fetch('/api/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: t }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.intent) {
            setLlmDetected(data.intent as Intent);
            lastClassifiedRef.current = t;
          }
        }
      } catch {
        // fall back to heuristic
      } finally {
        setClassifying(false);
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [text, mode]);

  function clearResults() {
    setAnswer(null);
    setList(null);
    setDuplicate(null);
    setError(null);
  }

  async function submit(force = false) {
    const t = text.trim();
    if (!t || loading) return;
    setLoading(true);
    if (!force) clearResults();
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, mode, force }),
      });

      if (res.status === 401) {
        router.push('/login');
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.duplicate) {
        setDuplicate({ similar: data.similar, threshold: data.threshold });
        return;
      }

      if (!res.ok) {
        setError(data.error ?? `Ошибка ${res.status}`);
        return;
      }

      if (data.intent === 'question') {
        setAnswer({ question: t, answer: data.answer, sources: data.sources ?? [] });
        setText('');
        setLlmDetected(null);
      } else if (data.intent === 'list') {
        setList({
          query: t,
          description: data.query?.description ?? '',
          items: data.items ?? [],
        });
        setText('');
        setLlmDetected(null);
      } else {
        setText('');
        setMode('auto');
        setLlmDetected(null);
        setSaved(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Сетевая ошибка');
    } finally {
      setLoading(false);
    }
  }

  function updateListItem(updated: ThoughtItem) {
    setList((prev) =>
      prev
        ? { ...prev, items: prev.items.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)) }
        : prev,
    );
  }
  function removeListItem(id: number) {
    setList((prev) => (prev ? { ...prev, items: prev.items.filter((x) => x.id !== id) } : prev));
  }

  const showHint = text.trim().length > 0;
  const intentMeta = INTENT_LABEL[detected];

  return (
    <div className="flex flex-col h-full w-full mx-auto" style={{ maxWidth: '42rem' }}>
      {/* TOP: input bar pinned (never moves with keyboard) */}
      <div className="shrink-0 px-4 pt-3 pb-3">
        <div className="flex items-center justify-center gap-1 mb-2 text-xs flex-wrap">
          {MODE_CHIPS.map((chip) => {
            const isActive = mode === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setMode(chip.key)}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  isActive ? chip.active : 'text-paper-500 hover:text-paper-800 hover:bg-paper-200/60'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="relative rounded-3xl bg-white border border-paper-300 shadow-sm shadow-paper-400/30 transition-all focus-within:border-accent focus-within:shadow-md focus-within:shadow-accent/15">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Запиши мысль, задачу, задай вопрос или попроси показать…"
            rows={1}
            className="w-full bg-transparent border-0 outline-none resize-none px-5 pt-4 pb-2 text-[16px] leading-relaxed text-paper-800 placeholder:text-paper-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
            <div className="text-xs text-paper-500 flex items-center gap-1.5 min-w-0 flex-1">
              {showHint ? (
                <span className="truncate animate-fade-in flex items-center gap-1.5">
                  <SparkleIcon size={11} className={intentMeta.color} />
                  <span className={intentMeta.color + ' font-medium'}>{intentMeta.label}</span>
                  {classifying && mode === 'auto' && (
                    <span className="text-paper-400">· думаю…</span>
                  )}
                  {!classifying && (
                    <span className="text-paper-400">— {ACTION_LABEL[detected]}</span>
                  )}
                </span>
              ) : (
                <span className="hidden sm:inline">Enter — отправить · Shift+Enter — новая строка</span>
              )}
            </div>
            <button
              onClick={() => submit(false)}
              disabled={loading || !text.trim()}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-accent-deep text-white flex items-center justify-center transition-all duration-150 hover:scale-105 hover:shadow-lg hover:shadow-accent/30 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              aria-label="Отправить"
            >
              {loading ? (
                <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <ArrowUpIcon size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* BELOW: content - empty greeting or scrollable results */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4"
        style={{
          overscrollBehavior: 'contain',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {!hasResult ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-semibold text-paper-800">
                Что у тебя на уме?
              </h1>
              {saved && (
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent-deep bg-accent-tint px-3 py-1.5 rounded-full animate-fade-in">
                  <CheckIcon size={12} /> сохранено
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-3 space-y-3">
            <div className="flex justify-end">
              <button
                className="text-xs px-2.5 py-1 rounded-md text-paper-500 hover:text-paper-800 hover:bg-paper-200/60"
                onClick={clearResults}
              >
                ✕ закрыть
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {duplicate && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <div className="text-amber-800 text-sm font-medium">
                  Похоже, эта мысль уже записана
                </div>
                <div className="mt-2.5 space-y-2">
                  {duplicate.similar.map((s) => (
                    <div key={s.id} className="text-sm text-paper-800">
                      <span className="text-paper-500 text-xs mr-2">
                        {new Date(s.created_at).toLocaleDateString('ru-RU')} ·{' '}
                        {(s.similarity * 100).toFixed(0)}%
                      </span>
                      {s.content}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg text-paper-700 hover:bg-paper-200/60"
                    onClick={() => setDuplicate(null)}
                  >
                    Отмена
                  </button>
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-deep"
                    onClick={() => submit(true)}
                    disabled={loading}
                  >
                    Всё равно сохранить
                  </button>
                </div>
              </div>
            )}

            {answer && (
              <div>
                <div className="text-xs text-paper-500 mb-1.5 flex items-center gap-1.5">
                  <SparkleIcon size={11} className="text-sky-600" />
                  <span>{answer.question}</span>
                </div>
                <div className="rounded-2xl bg-white border border-paper-300 p-4 whitespace-pre-wrap leading-relaxed text-paper-800 shadow-sm shadow-paper-400/20">
                  {answer.answer}
                </div>
                {answer.sources.length > 0 && (
                  <div className="mt-2.5">
                    <div className="text-xs text-paper-500 mb-1">Из твоих записей:</div>
                    <div className="space-y-1">
                      {answer.sources.map((s) => (
                        <div key={s.id} className="text-xs text-paper-600">
                          <span className="text-paper-500">
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
              </div>
            )}

            {list && (
              <div>
                <div className="text-xs text-paper-500 mb-2 flex items-center gap-1.5">
                  <SparkleIcon size={11} className="text-accent-deep" />
                  <span>{list.description || list.query}</span>
                  <span className="text-paper-400">· {list.items.length}</span>
                </div>
                {list.items.length === 0 ? (
                  <div className="rounded-2xl bg-white border border-paper-300 p-6 text-center text-sm text-paper-500">
                    Ничего не нашлось по этому запросу
                  </div>
                ) : (
                  <div className="space-y-2">
                    {list.items.map((item) => (
                      <ThoughtCard
                        key={item.id}
                        item={item}
                        onDelete={removeListItem}
                        onUpdate={updateListItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
