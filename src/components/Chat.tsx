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
  thought: { label: 'мысль', color: 'text-accent-soft' },
  question: { label: 'вопрос', color: 'text-sky-300' },
  task: { label: 'задача', color: 'text-amber-300' },
  list: { label: 'список', color: 'text-emerald-300' },
};

const ACTION_LABEL: Record<Intent, string> = {
  thought: 'сохраню как мысль',
  question: 'найду ответ',
  task: 'добавлю в задачи',
  list: 'покажу выборку',
};

const MODE_CHIPS: Array<{ key: Mode; label: string; active: string }> = [
  { key: 'auto', label: 'авто', active: 'bg-white/10 text-white' },
  { key: 'thought', label: '💭 мысль', active: 'bg-accent/25 text-accent-soft' },
  { key: 'task', label: '📋 задача', active: 'bg-amber-400/20 text-amber-200' },
  { key: 'question', label: '❓ вопрос', active: 'bg-sky-400/20 text-sky-200' },
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
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const lastClassifiedRef = useRef<string>('');

  // iOS keyboard: keep input visible without the WHOLE page scrolling.
  // We track visualViewport and apply a bottom padding to the shell.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        document.documentElement.style.setProperty('--kb', `${offset}px`);
        setKeyboardOpen(offset > 80);
      });
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      cancelAnimationFrame(raf);
    };
  }, []);

  const hasResult = Boolean(answer || list || duplicate || error);

  const detected: Intent =
    mode !== 'auto'
      ? mode
      : llmDetected ?? (text.trim() ? classify(text) : 'thought');

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [text]);

  // saved flash
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  // scroll results to top on change
  useEffect(() => {
    if (hasResult && resultsScrollRef.current) resultsScrollRef.current.scrollTop = 0;
  }, [answer, list, duplicate, error, hasResult]);

  // debounced LLM classify on text/mode change
  useEffect(() => {
    const t = text.trim();
    if (mode !== 'auto' || !t || t.length < 2) {
      setLlmDetected(null);
      return;
    }
    // Hard rule: ends with "?" → always a question, no LLM call needed
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
        // ignore; fallback heuristic will render
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

  // ─── INPUT BLOCK (used in both layouts) ───
  const inputBlock = (
    <>
      <div className="flex items-center justify-center gap-1 mb-2 text-xs flex-wrap">
        {MODE_CHIPS.map((chip) => {
          const isActive = mode === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setMode(chip.key)}
              className={`px-3 py-1.5 rounded-full transition-all ${
                isActive ? chip.active : 'text-ink-400 hover:text-ink-200 hover:bg-white/5'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="relative rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/30 transition-all focus-within:bg-white/[0.08] focus-within:border-accent/50 focus-within:shadow-accent/10">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Запиши мысль, задачу, задай вопрос или попроси показать…"
          rows={1}
          className="w-full bg-transparent border-0 outline-none resize-none px-5 pt-4 pb-2 text-[16px] leading-relaxed text-ink-50 placeholder:text-ink-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
          <div className="text-xs text-ink-500 flex items-center gap-1.5 min-w-0 flex-1">
            {showHint ? (
              <span className="truncate animate-fade-in flex items-center gap-1.5">
                <SparkleIcon size={11} className={intentMeta.color} />
                <span className={intentMeta.color}>{intentMeta.label}</span>
                {classifying && mode === 'auto' && (
                  <span className="text-ink-500">· думаю…</span>
                )}
                {!classifying && (
                  <span className="text-ink-500">— {ACTION_LABEL[detected]}</span>
                )}
              </span>
            ) : (
              <span className="hidden sm:inline">Enter — отправить · Shift+Enter — новая строка</span>
            )}
          </div>
          <button
            onClick={() => submit(false)}
            disabled={loading || !text.trim()}
            className="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-accent-deep text-ink-950 flex items-center justify-center transition-all duration-150 hover:scale-105 hover:shadow-lg hover:shadow-accent/30 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            aria-label="Отправить"
          >
            {loading ? (
              <span className="h-3 w-3 rounded-full border-2 border-ink-950/40 border-t-ink-950 animate-spin" />
            ) : (
              <ArrowUpIcon size={16} />
            )}
          </button>
        </div>
      </div>
    </>
  );

  // ─── EMPTY STATE: input centered when keyboard closed, bottom when open ───
  if (!hasResult) {
    return (
      <div
        className={`flex flex-col items-center h-full px-4 w-full mx-auto transition-all ${
          keyboardOpen ? 'justify-end pb-3' : 'justify-center'
        }`}
        style={{ maxWidth: '42rem' }}
      >
        <div className="w-full">
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-semibold bg-gradient-to-br from-white via-ink-100 to-accent-soft bg-clip-text text-transparent">
              Что у тебя на уме?
            </h1>
            {saved && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-300 animate-fade-in">
                <CheckIcon size={12} /> сохранено
              </div>
            )}
          </div>
          {inputBlock}
        </div>
      </div>
    );
  }

  // ─── WITH RESULT: results scroll top, input pinned bottom ───
  return (
    <div className="flex flex-col h-full w-full mx-auto" style={{ maxWidth: '42rem' }}>
      <div
        ref={resultsScrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-4"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="py-2 space-y-3 pb-4">
          <div className="flex justify-end">
            <button
              className="text-xs px-2.5 py-1 rounded-md text-ink-400 hover:text-ink-100 hover:bg-white/5"
              onClick={clearResults}
            >
              ✕ закрыть
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 backdrop-blur p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {duplicate && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 backdrop-blur p-4">
              <div className="text-amber-200 text-sm font-medium">
                Похоже, эта мысль уже записана
              </div>
              <div className="mt-2.5 space-y-2">
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
                <button
                  className="text-xs px-3 py-1.5 rounded-lg text-ink-200 hover:bg-white/5"
                  onClick={() => setDuplicate(null)}
                >
                  Отмена
                </button>
                <button
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent text-ink-950 hover:bg-accent-soft"
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
              <div className="text-xs text-ink-400 mb-1.5 flex items-center gap-1.5">
                <SparkleIcon size={11} className="text-sky-300" />
                <span>{answer.question}</span>
              </div>
              <div className="rounded-2xl bg-ink-800/70 backdrop-blur border border-white/10 p-4 whitespace-pre-wrap leading-relaxed text-ink-50 shadow-lg shadow-black/20">
                {answer.answer}
              </div>
              {answer.sources.length > 0 && (
                <div className="mt-2.5">
                  <div className="text-xs text-ink-500 mb-1">Из твоих записей:</div>
                  <div className="space-y-1">
                    {answer.sources.map((s) => (
                      <div key={s.id} className="text-xs text-ink-400">
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
            </div>
          )}

          {list && (
            <div>
              <div className="text-xs text-ink-400 mb-2 flex items-center gap-1.5">
                <SparkleIcon size={11} className="text-emerald-300" />
                <span>{list.description || list.query}</span>
                <span className="text-ink-500">· {list.items.length}</span>
              </div>
              {list.items.length === 0 ? (
                <div className="rounded-2xl bg-ink-800/50 border border-white/10 p-6 text-center text-sm text-ink-400">
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
      </div>

      <div
        className="shrink-0 px-4 pt-2"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {inputBlock}
      </div>
    </div>
  );
}
