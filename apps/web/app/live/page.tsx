import { TopNav } from '@/components/top-nav';
import { LiveViewer } from './live-viewer';

export default function LivePage() {
  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)]">
        <div className="px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Transmisión en vivo</h1>
          <LiveViewer />
        </div>
      </main>
    </>
  );
}
