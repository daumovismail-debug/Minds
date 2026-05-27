import { Header } from '@/components/Header';
import { Chat } from '@/components/Chat';
import { getCurrentSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getCurrentSession();
  return (
    <div
      className="fixed left-0 right-0 top-0 flex flex-col overflow-hidden"
      style={{
        height: 'var(--vv-h, 100dvh)',
        transform: 'translateY(var(--vv-y, 0px))',
      }}
    >
      <Header username={session?.username} />
      <main className="flex-1 min-h-0 flex flex-col">
        <Chat />
      </main>
    </div>
  );
}
