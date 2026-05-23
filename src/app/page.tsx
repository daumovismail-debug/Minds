import { Header } from '@/components/Header';
import { ThoughtsFeed } from '@/components/ThoughtsFeed';
import { getCurrentSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getCurrentSession();
  return (
    <>
      <Header username={session?.username} />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <ThoughtsFeed />
      </main>
    </>
  );
}
