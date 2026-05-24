'use client';

import { useEffect, useState } from 'react';

const GREETINGS = [
  'Что у тебя на уме?',
  "What's on your mind?",
  '¿Qué tienes en mente?',
  'Quoi de neuf dans ta tête ?',
  'Was hast du im Kopf?',
  "Cos'hai in mente?",
  'O que você está pensando?',
  'Aklında ne var?',
  '何を考えていますか？',
  '你在想什么？',
  '무슨 생각해?',
  'ماذا يدور في ذهنك؟',
];

const VISIBLE_MS = 3500;
const FADE_MS = 600;

export function AnimatedGreeting() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = () => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % GREETINGS.length);
        setVisible(true);
      }, FADE_MS);
    };
    const interval = setInterval(cycle, VISIBLE_MS + FADE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1
      className={`text-3xl sm:text-4xl font-semibold text-paper-800 transition-opacity ease-in-out`}
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${FADE_MS}ms`,
      }}
    >
      {GREETINGS[index]}
    </h1>
  );
}
