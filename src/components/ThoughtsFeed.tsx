'use client';

import { useEffect, useState } from 'react';
import { SmartInput } from './SmartInput';
import { ThoughtCard, type ThoughtItem } from './ThoughtCard';

export function ThoughtsFeed() {
  const [items, setItems] = useState<ThoughtItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/thoughts');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeTasks = items.filter((i) => i.kind === 'task' && !i.done);
  const doneTasks = items.filter((i) => i.kind === 'task' && i.done);
  const thoughts = items.filter((i) => i.kind === 'thought');
  const isEmpty = !loading && items.length === 0;

  function update(updated: ThoughtItem) {
    setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
  }
  function remove(id: number) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className={`${isEmpty ? 'flex flex-col items-center justify-center min-h-[70svh]' : 'pt-4'}`}>
      <div className={`w-full max-w-2xl mx-auto ${isEmpty ? '' : 'mb-8'}`}>
        {isEmpty && (
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-semibold bg-gradient-to-br from-white via-ink-100 to-accent-soft bg-clip-text text-transparent">
              Что у тебя на уме?
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              запиши мысль, добавь задачу или спроси у своего прошлого
            </p>
          </div>
        )}
        <SmartInput onItemAdded={(t) => setItems((prev) => [t, ...prev])} />
      </div>

      {loading && items.length === 0 && (
        <div className="text-center text-ink-400 py-12 text-sm">Загрузка…</div>
      )}

      {!isEmpty && (
        <div className="max-w-2xl mx-auto w-full space-y-8">
          {activeTasks.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-amber-300/80 mb-2 px-1">
                Задачи ({activeTasks.length})
              </h2>
              <div className="space-y-2">
                {activeTasks.map((t) => (
                  <ThoughtCard key={t.id} item={t} onDelete={remove} onUpdate={update} />
                ))}
              </div>
            </section>
          )}

          {thoughts.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-accent-soft/80 mb-2 px-1">
                Мысли
              </h2>
              <div className="space-y-2">
                {thoughts.map((t) => (
                  <ThoughtCard key={t.id} item={t} onDelete={remove} onUpdate={update} />
                ))}
              </div>
            </section>
          )}

          {doneTasks.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-ink-500 mb-2 px-1">
                Выполнено ({doneTasks.length})
              </h2>
              <div className="space-y-2">
                {doneTasks.map((t) => (
                  <ThoughtCard key={t.id} item={t} onDelete={remove} onUpdate={update} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
