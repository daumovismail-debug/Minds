'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === 'invalid_credentials' ? 'Неверный логин или пароль' : 'Ошибка входа');
        return;
      }
      const next = params.get('next') ?? '/';
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm animate-slide-up">
      <div className="mb-6 text-center">
        <div className="inline-block text-3xl font-semibold bg-gradient-to-r from-accent-soft to-accent bg-clip-text text-transparent">
          Minds
        </div>
        <p className="mt-1 text-sm text-ink-300">Твой второй мозг</p>
      </div>

      <label className="block text-sm text-ink-200 mb-1">Логин</label>
      <input
        type="text"
        className="input mb-3"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
        autoComplete="username"
        required
      />

      <label className="block text-sm text-ink-200 mb-1">Пароль</label>
      <input
        type="password"
        className="input mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />

      {error && <div className="mb-3 text-sm text-red-300">{error}</div>}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Вход…' : 'Войти'}
      </button>

      <div className="mt-4 text-center text-sm text-ink-400">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-accent-soft hover:text-accent">
          Зарегистрироваться
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
