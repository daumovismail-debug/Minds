'use client';

import { useEffect, useState } from 'react';
import { SmartInput } from './SmartInput';
import { ThoughtCard, type ThoughtItem } from './ThoughtCard';

export function ThoughtsFeed() {
  const [thoughts, setThoughts] = useState<ThoughtItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/thoughts');
      if (res.ok) {
        const data = await res.json();
        setThoughts(data.thoughts);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="space-y-6">
      <SmartInput onThoughtAdded={(t) => setThoughts((prev) => [t, ...prev])} />

      <div className="space-y-3">
        {loading && thoughts.length === 0 && (
          <div className="text-center text-ink-400 py-12 text-sm">Загрузка…</div>
        )}
        {!loading && thoughts.length === 0 && (
          <div className="text-center text-ink-400 py-12 text-sm">
            Пока пусто — запиши свою первую мысль
          </div>
        )}
        {thoughts.map((t) => (
          <ThoughtCard
            key={t.id}
            thought={t}
            onDelete={(id) => setThoughts((prev) => prev.filter((x) => x.id !== id))}
            onUpdate={(updated) =>
              setThoughts((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)))
            }
          />
        ))}
      </div>
    </div>
  );
}
