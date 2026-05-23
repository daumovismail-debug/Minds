'use client';

import { useEffect, useState } from 'react';

type Star = {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  bright: boolean;
};

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, () => {
    const bright = Math.random() < 0.18;
    return {
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: bright ? Math.random() * 2 + 1.6 : Math.random() * 1.3 + 0.4,
      delay: Math.random() * 6,
      duration: Math.random() * 3.5 + 2.5,
      bright,
    };
  });
}

export function StarsBackground() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(makeStars(140));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.12),_transparent_60%),radial-gradient(ellipse_at_bottom,_rgba(56,189,248,0.08),_transparent_60%)]" />
      {stars.map((s, i) => (
        <span
          key={i}
          className={s.bright ? 'star star-bright' : 'star'}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
      <span className="shooting-star shooting-star-1" />
      <span className="shooting-star shooting-star-2" />
    </div>
  );
}
