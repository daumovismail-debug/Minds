import { Header } from '@/components/Header';
import { ThoughtsFeed } from '@/components/ThoughtsFeed';
import { getCurrentSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getCurrentSession();
  return (
    <>
      <Header username={session?.username} />
      <main
        className="px-4"
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <ThoughtsFeed />
      </main>
    </>
  );
}
