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
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm animate-slide-up bg-white rounded-2xl border border-paper-300 shadow-sm shadow-paper-400/20 p-6"
    >
      <div className="mb-6 text-center">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-accent-deep items-center justify-center text-white text-2xl font-bold shadow-md shadow-accent/30 mb-3">
          M
        </div>
        <h1 className="text-2xl font-semibold text-paper-800">Minds</h1>
        <p className="mt-1 text-sm text-paper-500">Твой второй мозг</p>
      </div>

      <label className="block text-sm text-paper-700 mb-1">Логин</label>
      <input
        type="text"
        className="input mb-3"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
        autoComplete="username"
        required
      />

      <label className="block text-sm text-paper-700 mb-1">Пароль</label>
      <input
        type="password"
        className="input mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Вход…' : 'Войти'}
      </button>

      <div className="mt-4 text-center text-sm text-paper-500">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-accent-deep hover:text-accent font-medium">
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
