'use client';

import { useState } from 'react';

type Source = {
  id: number;
  content: string;
  created_at: string;
  similarity: number;
};

export function AskBox() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);

  async function ask() {
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setAnswer(null);
    setSources([]);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnswer(data.answer);
        setSources(data.sources ?? []);
      } else {
        setAnswer('Произошла ошибка при поиске ответа.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card border-accent/20">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        <div className="text-sm font-medium text-accent-soft">Спроси у себя</div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Например: стоит ли смотреть телефон перед сном?"
          className="input flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              ask();
            }
          }}
        />
        <button className="btn-primary" onClick={ask} disabled={loading || !question.trim()}>
          {loading ? 'Думаю…' : 'Спросить'}
        </button>
      </div>

      {answer && (
        <div className="mt-4 animate-slide-up">
          <div className="rounded-lg bg-ink-800/60 border border-white/5 p-4 whitespace-pre-wrap leading-relaxed">
            {answer}
          </div>
          {sources.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-ink-400 mb-1">Источники из твоих записей:</div>
              <div className="space-y-1">
                {sources.map((s) => (
                  <div key={s.id} className="text-xs text-ink-300">
                    <span className="text-ink-500">
                      #{s.id} · {new Date(s.created_at).toLocaleDateString('ru-RU')} ·{' '}
                      {(s.similarity * 100).toFixed(0)}%
                    </span>{' '}
                    — {s.content.slice(0, 120)}
                    {s.content.length > 120 ? '…' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
