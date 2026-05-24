import { Header } from '@/components/Header';
import { Chat } from '@/components/Chat';
import { getCurrentSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getCurrentSession();
  return (
    <div
      className="fixed flex flex-col overflow-hidden"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 'var(--kb, 0px)',
      }}
    >
      <Header username={session?.username} />
      <main className="flex-1 min-h-0 flex flex-col">
        <Chat />
      </main>
    </div>
  );
}
