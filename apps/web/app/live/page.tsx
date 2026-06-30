import { TopNav } from '@/components/top-nav';
import { LiveViewer } from './live-viewer';

export default function LivePage() {
  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)]">
        <div className="px-2 py-3 sm:px-4 sm:py-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Transmisión en vivo</h1>
          <LiveViewer />
        </div>
      </main>
    </>
  );
}
