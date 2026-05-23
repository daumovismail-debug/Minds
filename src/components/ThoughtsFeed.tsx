'use client';

import { useEffect, useState } from 'react';
import { SmartInput } from './SmartInput';
import { ThoughtCard, type ThoughtItem } from './ThoughtCard';

export function ThoughtsFeed() {
  const [thoughts, setThoughts] = useState<ThoughtItem[]>([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
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

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      loadAll();
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/thoughts?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setThoughts(data.thoughts);
        }
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <SmartInput onThoughtAdded={(t) => setThoughts((prev) => [t, ...prev])} />

      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 поиск по смыслу…"
          className="input"
        />
      </div>

      <div className="space-y-3">
        {loading && thoughts.length === 0 && (
          <div className="text-center text-ink-400 py-12 text-sm">Загрузка…</div>
        )}
        {!loading && thoughts.length === 0 && (
          <div className="text-center text-ink-400 py-12 text-sm">
            {search ? 'Ничего не найдено' : 'Пока пусто — запиши свою первую мысль'}
          </div>
        )}
        {searching && <div className="text-xs text-ink-400">Поиск…</div>}
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
