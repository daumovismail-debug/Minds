'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ERRORS: Record<string, string> = {
  invalid_email: 'Введи корректный email',
  password_too_short: 'Пароль должен быть минимум 6 символов',
  password_too_long: 'Слишком длинный пароль',
  email_taken: 'Этот email уже зарегистрирован',
};

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(ERRORS[data.error] ?? 'Не получилось зарегистрироваться');
        return;
      }
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm animate-slide-up">
        <div className="mb-6 text-center">
          <div className="inline-block text-3xl font-semibold bg-gradient-to-r from-accent-soft to-accent bg-clip-text text-transparent">
            Minds
          </div>
          <p className="mt-1 text-sm text-ink-300">Создай аккаунт</p>
        </div>

        <label className="block text-sm text-ink-200 mb-1">Email</label>
        <input
          type="email"
          className="input mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          autoComplete="email"
          required
        />

        <label className="block text-sm text-ink-200 mb-1">Пароль</label>
        <input
          type="password"
          className="input mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        <label className="block text-sm text-ink-200 mb-1">Повтори пароль</label>
        <input
          type="password"
          className="input mb-4"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        {error && <div className="mb-3 text-sm text-red-300">{error}</div>}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Создаём…' : 'Зарегистрироваться'}
        </button>

        <div className="mt-4 text-center text-sm text-ink-400">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-accent-soft hover:text-accent">
            Войти
          </Link>
        </div>
      </form>
    </main>
  );
}
