import { Header } from '@/components/Header';
import { Chat } from '@/components/Chat';
import { getCurrentSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getCurrentSession();
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        paddingBottom: 'var(--kb, 0px)',
        transform: 'translateY(var(--vv-offset, 0px))',
        transition:
          'padding-bottom 220ms cubic-bezier(0.32, 0.72, 0, 1), transform 100ms linear',
      }}
    >
      <Header username={session?.username} />
      <main className="flex-1 min-h-0 flex flex-col">
        <Chat />
      </main>
    </div>
  );
}
