'use client';

import { useState } from 'react';

export type ThoughtItem = {
  id: number;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  similarity?: number;
};

type Props = {
  thought: ThoughtItem;
  onDelete: (id: number) => void;
  onUpdate: (t: ThoughtItem) => void;
};

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ThoughtCard({ thought, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(thought.content);
  const [tags, setTags] = useState(thought.tags.join(', '));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/thoughts/${thought.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.thought);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!confirm('Удалить эту мысль?')) return;
    const res = await fetch(`/api/thoughts/${thought.id}`, { method: 'DELETE' });
    if (res.ok) onDelete(thought.id);
  }

  return (
    <div className="card animate-fade-in group">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-ink-400 flex items-center gap-2">
          <span>{formatDate(thought.created_at)}</span>
          {typeof thought.similarity === 'number' && (
            <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent-soft">
              {(thought.similarity * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-ghost text-xs px-2 py-1">
              Изменить
            </button>
          )}
          <button onClick={del} className="btn-danger text-xs px-2 py-1">
            Удалить
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            className="input min-h-[100px] resize-y"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <input
            className="input"
            placeholder="теги через запятую"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                setEditing(false);
                setContent(thought.content);
                setTags(thought.tags.join(', '));
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
        <>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink-50">{thought.content}</p>
          {thought.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {thought.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-ink-200"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
