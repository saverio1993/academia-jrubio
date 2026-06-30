import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LiveBroadcaster } from './live-broadcaster';

export default async function AdminLivePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transmisión en vivo</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Transmite directamente a tus alumnos — sin YouTube, sin servicios externos.
        </p>
      </div>
      <LiveBroadcaster />
    </div>
  );
}
