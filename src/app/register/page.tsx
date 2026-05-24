'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ERRORS: Record<string, string> = {
  invalid_username: 'Введи логин',
  username_too_short: 'Логин минимум 3 символа',
  username_too_long: 'Логин максимум 32 символа',
  username_invalid_chars: 'Логин: только латиница, цифры и _',
  password_too_short: 'Пароль минимум 6 символов',
  password_too_long: 'Слишком длинный пароль',
  username_taken: 'Этот логин уже занят',
};

export default function RegisterPage() {
  const [username, setUsername] = useState('');
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
        body: JSON.stringify({ username, password }),
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
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm animate-slide-up bg-white rounded-2xl border border-paper-300 shadow-sm shadow-paper-400/20 p-6"
      >
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-accent-deep items-center justify-center text-white text-2xl font-bold shadow-md shadow-accent/30 mb-3">
            M
          </div>
          <h1 className="text-2xl font-semibold text-paper-800">Создай аккаунт</h1>
        </div>

        <label className="block text-sm text-paper-700 mb-1">Логин</label>
        <input
          type="text"
          className="input mb-1"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          pattern="[a-zA-Z0-9_]{3,32}"
          minLength={3}
          maxLength={32}
          required
        />
        <div className="text-xs text-paper-500 mb-3">3–32 символа, латиница, цифры, _</div>

        <label className="block text-sm text-paper-700 mb-1">Пароль</label>
        <input
          type="password"
          className="input mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        <label className="block text-sm text-paper-700 mb-1">Повтори пароль</label>
        <input
          type="password"
          className="input mb-4"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Создаём…' : 'Зарегистрироваться'}
        </button>

        <div className="mt-4 text-center text-sm text-paper-500">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-accent-deep hover:text-accent font-medium">
            Войти
          </Link>
        </div>
      </form>
    </main>
  );
}
