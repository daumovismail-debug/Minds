'use client';

import { useState } from 'react';
import { CheckIcon, TrashIcon } from './icons';

export type ThoughtItem = {
  id: number;
  content: string;
  tags: string[];
  kind: 'thought' | 'task';
  done: boolean;
  urgent: boolean;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  similarity?: number;
};

type Props = {
  item: ThoughtItem;
  onDelete: (id: number) => void;
  onUpdate: (t: ThoughtItem) => void;
};

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}

export function ThoughtCard({ item, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const isTask = item.kind === 'task';
  const isDone = item.done;
  const isUrgent = isTask && item.urgent && !isDone;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/thoughts/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.item);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/thoughts/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !item.done }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.item);
      }
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm(isTask ? 'Удалить задачу?' : 'Удалить мысль?')) return;
    const res = await fetch(`/api/thoughts/${item.id}`, { method: 'DELETE' });
    if (res.ok) onDelete(item.id);
  }

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 ${
        isUrgent
          ? 'bg-red-500/10 border-red-400/40 hover:border-red-400/60 shadow-red-500/10'
          : isTask
            ? isDone
              ? 'bg-ink-900/30 border-white/5'
              : 'bg-ink-900/50 border-amber-400/15 hover:border-amber-400/30'
            : 'bg-ink-900/50 border-white/10 hover:border-white/20'
      } backdrop-blur-md p-4 shadow-lg shadow-black/10`}
    >
      <div className="flex items-start gap-3">
        {isTask && (
          <button
            onClick={toggleDone}
            disabled={busy}
            className={`mt-0.5 shrink-0 h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center ${
              isDone
                ? 'bg-accent border-accent text-ink-950'
                : 'border-amber-400/60 hover:border-amber-300 hover:bg-amber-400/10'
            }`}
            aria-label={isDone ? 'снять отметку' : 'отметить выполненной'}
          >
            {isDone && <CheckIcon size={12} />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span>{formatDate(item.created_at)}</span>
            {isTask && !isDone && !isUrgent && (
              <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 text-[10px] uppercase tracking-wider font-medium">
                задача
              </span>
            )}
            {isUrgent && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/25 text-red-200 text-[10px] uppercase tracking-wider font-semibold animate-pulse">
                срочно
              </span>
            )}
            {typeof item.similarity === 'number' && (
              <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent-soft">
                {(item.similarity * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                className="input min-h-[80px] resize-y text-base"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button
                  className="btn-ghost text-xs"
                  onClick={() => {
                    setEditing(false);
                    setContent(item.content);
                  }}
                >
                  Отмена
                </button>
                <button className="btn-primary text-xs" onClick={save} disabled={saving}>
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`mt-1.5 whitespace-pre-wrap leading-relaxed ${
                isDone ? 'text-ink-400 line-through decoration-ink-500/60' : 'text-ink-50'
              }`}
            >
              {item.content}
            </p>
          )}

          {item.tags.length > 0 && !editing && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-ink-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {!editing && (
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col gap-1">
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2 py-1 rounded-md text-ink-300 hover:bg-white/5 hover:text-ink-100"
            >
              изменить
            </button>
            <button
              onClick={del}
              className="text-xs px-2 py-1 rounded-md text-red-300/80 hover:bg-red-500/10 hover:text-red-200 flex items-center gap-1"
            >
              <TrashIcon size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
