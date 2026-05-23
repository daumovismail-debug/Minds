'use client';

import { useRouter } from 'next/navigation';

type Props = { email?: string };

export function Header({ email }: Props) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-ink-950/60 border-b border-white/5">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-accent-deep flex items-center justify-center text-ink-950 font-bold">
            M
          </div>
          <div className="font-semibold tracking-tight">Minds</div>
        </div>
        <div className="flex items-center gap-3">
          {email && <div className="text-xs text-ink-400 hidden sm:block">{email}</div>}
          <button onClick={logout} className="btn-ghost text-xs">
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
