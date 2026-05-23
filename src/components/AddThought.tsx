'use client';

import { useState } from 'react';
import type { ThoughtItem } from './ThoughtCard';

type DuplicateInfo = {
  similar: Array<ThoughtItem & { similarity: number }>;
  threshold: number;
};

type Props = {
  onAdded: (t: ThoughtItem) => void;
};

export function AddThought({ onAdded }: Props) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  async function submit(force = false) {
    const text = content.trim();
    if (!text) return;
    setLoading(true);
    setDuplicate(null);
    try {
      const res = await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          force,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        setDuplicate({ similar: data.similar, threshold: data.threshold });
        return;
      }

      if (res.ok) {
        const data = await res.json();
        onAdded(data.thought);
        setContent('');
        setTags('');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Записать мысль или принцип…"
        className="input min-h-[110px] resize-y text-base"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="mt-2 flex flex-col sm:flex-row gap-2">
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="теги через запятую (опц.)"
          className="input flex-1"
        />
        <button
          className="btn-primary sm:w-auto"
          onClick={() => submit(false)}
          disabled={loading || !content.trim()}
        >
          {loading ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
      <div className="mt-2 text-xs text-ink-400">Ctrl/⌘ + Enter — сохранить</div>

      {duplicate && (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 animate-slide-up">
          <div className="text-amber-200 text-sm font-medium">
            Похоже, эта мысль уже была записана
          </div>
          <div className="mt-2 space-y-2">
            {duplicate.similar.map((s) => (
              <div key={s.id} className="text-sm text-ink-100">
                <span className="text-ink-400 text-xs mr-2">
                  {new Date(s.created_at).toLocaleDateString('ru-RU')} · {(s.similarity * 100).toFixed(0)}%
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
    </div>
  );
}
