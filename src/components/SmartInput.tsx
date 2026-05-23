'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { classify, type Intent } from '@/lib/classify';
import { ArrowUpIcon, CheckIcon, SparkleIcon } from './icons';
import type { ThoughtItem } from './ThoughtCard';

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

type Props = {
  onItemAdded: (t: ThoughtItem) => void;
};

const INTENT_LABEL: Record<Intent, { label: string; color: string }> = {
  thought: { label: 'мысль', color: 'text-accent-soft' },
  question: { label: 'вопрос', color: 'text-sky-300' },
  task: { label: 'задача', color: 'text-amber-300' },
};

const ACTION_LABEL: Record<Intent, string> = {
  thought: 'сохраню как мысль',
  question: 'найду ответ в твоих записях',
  task: 'добавлю в задачи',
};

const MODE_CHIPS: Array<{ key: Mode; label: string; active: string }> = [
  { key: 'auto', label: 'авто', active: 'bg-white/10 text-white' },
  { key: 'thought', label: '💭 мысль', active: 'bg-accent/25 text-accent-soft' },
  { key: 'task', label: '📋 задача', active: 'bg-amber-400/20 text-amber-200' },
  { key: 'question', label: '❓ вопрос', active: 'bg-sky-400/20 text-sky-200' },
];

export function SmartInput({ onItemAdded }: Props) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('auto');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const detected: Intent = mode !== 'auto' ? mode : text.trim() ? classify(text) : 'thought';

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 280) + 'px';
  }, [text]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  async function submit(force = false) {
    const t = text.trim();
    if (!t || loading) return;
    setLoading(true);
    setDuplicate(null);
    setError(null);
    if (!force) setAnswer(null);
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
      } else {
        onItemAdded(data.thought);
        setText('');
        setMode('auto');
        setSaved(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Сетевая ошибка');
    } finally {
      setLoading(false);
    }
  }

  const showHint = text.trim().length > 0;
  const intentMeta = INTENT_LABEL[detected];

  return (
    <div className="w-full">
      {/* Mode chips */}
      <div className="flex items-center justify-center gap-1 mb-3 text-xs flex-wrap">
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
          placeholder="Запиши мысль, задачу или задай вопрос…"
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
                <span className="text-ink-500">— {ACTION_LABEL[detected]}</span>
              </span>
            ) : (
              <span className="hidden sm:inline">Enter — отправить · Shift+Enter — новая строка</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="text-xs text-emerald-300 flex items-center gap-1 animate-fade-in">
                <CheckIcon size={12} /> сохранено
              </span>
            )}
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
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 backdrop-blur p-3 text-sm text-red-200 animate-slide-up flex items-start justify-between gap-2">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300/70 hover:text-red-100 text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {duplicate && (
        <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 backdrop-blur p-4 animate-slide-up">
          <div className="text-amber-200 text-sm font-medium">Похоже, эта мысль уже записана</div>
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
        <div className="mt-4 animate-slide-up">
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
          <div className="mt-2 flex justify-end">
            <button
              className="text-xs px-3 py-1.5 rounded-lg text-ink-300 hover:bg-white/5"
              onClick={() => setAnswer(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
