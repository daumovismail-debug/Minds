import { Header } from '@/components/Header';
import { ThoughtsFeed } from '@/components/ThoughtsFeed';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <ThoughtsFeed />
      </main>
    </>
  );
}
