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
    <header className="shrink-0 bg-white/70 backdrop-blur-xl border-b border-paper-300">
      <div
        className="max-w-2xl mx-auto px-4 flex items-center justify-between"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-accent-deep flex items-center justify-center text-white font-bold shadow-md shadow-accent/30">
            M
          </div>
          <div className="font-semibold tracking-tight text-paper-800">Minds</div>
        </div>
        <div className="flex items-center gap-3">
          {username && <div className="text-xs text-paper-500 hidden sm:block">@{username}</div>}
          <button
            onClick={logout}
            className="text-xs text-paper-600 hover:text-paper-800 hover:bg-paper-200/60 px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
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
