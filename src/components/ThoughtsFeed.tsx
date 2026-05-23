'use client';

import { useEffect, useState } from 'react';
import { SmartInput } from './SmartInput';
import { ThoughtCard, type ThoughtItem } from './ThoughtCard';

type SectionKey = 'tasks' | 'thoughts' | 'done';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

type SectionProps = {
  title: string;
  count: number;
  accent: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function Section({ title, count, accent, open, onToggle, children }: SectionProps) {
  return (
    <section>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-1 py-2 text-xs uppercase tracking-widest ${accent} hover:opacity-80 transition-opacity`}
      >
        <ChevronIcon open={open} />
        <span>
          {title} ({count})
        </span>
      </button>
      {open && <div className="space-y-2 mt-1 animate-fade-in">{children}</div>}
    </section>
  );
}

export function ThoughtsFeed() {
  const [items, setItems] = useState<ThoughtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    tasks: true,
    thoughts: true,
    done: false,
  });

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
  const hasItems = items.length > 0;

  function update(updated: ThoughtItem) {
    setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
  }
  function remove(id: number) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }
  function toggle(key: SectionKey) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100svh-64px)]">
      {/* Vertically centered hero input */}
      <div className="flex flex-col items-center justify-center w-full min-h-[70svh] px-1">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-semibold bg-gradient-to-br from-white via-ink-100 to-accent-soft bg-clip-text text-transparent">
              Что у тебя на уме?
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              запиши мысль, добавь задачу или спроси у своего прошлого
            </p>
          </div>
          <SmartInput onItemAdded={(t) => setItems((prev) => [t, ...prev])} />
        </div>
      </div>

      {/* Collapsible sections below */}
      {loading && !hasItems && (
        <div className="text-center text-ink-400 py-12 text-sm">Загрузка…</div>
      )}

      {hasItems && (
        <div className="w-full max-w-2xl space-y-4 pb-12">
          {activeTasks.length > 0 && (
            <Section
              title="Задачи"
              count={activeTasks.length}
              accent="text-amber-300/80"
              open={open.tasks}
              onToggle={() => toggle('tasks')}
            >
              {activeTasks.map((t) => (
                <ThoughtCard key={t.id} item={t} onDelete={remove} onUpdate={update} />
              ))}
            </Section>
          )}

          {thoughts.length > 0 && (
            <Section
              title="Мысли"
              count={thoughts.length}
              accent="text-accent-soft/80"
              open={open.thoughts}
              onToggle={() => toggle('thoughts')}
            >
              {thoughts.map((t) => (
                <ThoughtCard key={t.id} item={t} onDelete={remove} onUpdate={update} />
              ))}
            </Section>
          )}

          {doneTasks.length > 0 && (
            <Section
              title="Выполнено"
              count={doneTasks.length}
              accent="text-ink-500"
              open={open.done}
              onToggle={() => toggle('done')}
            >
              {doneTasks.map((t) => (
                <ThoughtCard key={t.id} item={t} onDelete={remove} onUpdate={update} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
