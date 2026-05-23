'use client';

import { useRouter } from 'next/navigation';
import { LogoutIcon } from './icons';

type Props = { username?: string };

export function Header({ username }: Props) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/50 border-b border-white/5">
      <div
        className="max-w-2xl mx-auto px-4 flex items-center justify-between"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent via-accent to-accent-deep flex items-center justify-center text-ink-950 font-bold shadow-lg shadow-accent/20">
            M
          </div>
          <div className="font-semibold tracking-tight">Minds</div>
        </div>
        <div className="flex items-center gap-3">
          {username && <div className="text-xs text-ink-400 hidden sm:block">@{username}</div>}
          <button
            onClick={logout}
            className="text-xs text-ink-300 hover:text-ink-50 hover:bg-white/5 px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            aria-label="Выйти"
          >
            <LogoutIcon size={13} />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
}
