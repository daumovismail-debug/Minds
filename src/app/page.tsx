import { Header } from '@/components/Header';
import { Chat } from '@/components/Chat';
import { getCurrentSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getCurrentSession();
  return (
    <div
      className="fixed left-0 right-0 flex flex-col overflow-hidden"
      style={{
        top: 'var(--vv-top, 0px)',
        height: 'var(--vv-height, 100dvh)',
      }}
    >
      <Header username={session?.username} />
      <main className="flex-1 min-h-0 flex flex-col">
        <Chat />
      </main>
    </div>
  );
}
