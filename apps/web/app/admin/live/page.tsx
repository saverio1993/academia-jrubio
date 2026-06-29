import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LiveBroadcaster } from './live-broadcaster';

export default async function AdminLivePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/');

  const apiUrl = process.env.NEXT_PUBLIC_RENDER_UPLOAD_URL ?? 'https://academia-jrubio.onrender.com';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transmisión en vivo</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Transmite directamente a tus alumnos sin servicios externos.
        </p>
      </div>

      <LiveBroadcaster apiUrl={apiUrl} />
    </div>
  );
}
