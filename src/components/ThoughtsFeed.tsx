'use client';

import { useState } from 'react';
import { SmartInput } from './SmartInput';

export function ThoughtsFeed() {
  const [_bump, setBump] = useState(0);

  return (
    <div className="flex flex-col items-center min-h-[calc(100svh-64px)] justify-center">
      <div className="w-full max-w-2xl px-1">
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-semibold bg-gradient-to-br from-white via-ink-100 to-accent-soft bg-clip-text text-transparent">
            Что у тебя на уме?
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            запиши мысль · поставь задачу · спроси · попроси показать список
          </p>
        </div>
        <SmartInput onItemAdded={() => setBump((x) => x + 1)} />
        <div className="mt-6 text-center text-xs text-ink-500 leading-relaxed">
          <div className="font-medium text-ink-400 mb-1">примеры команд:</div>
          <div>«покажи все задачи» · «покажи срочные» · «покажи мысли за сегодня»</div>
        </div>
      </div>
    </div>
  );
}
