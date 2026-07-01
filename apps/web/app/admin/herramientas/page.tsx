export const dynamic = 'force-dynamic';

export default function HerramientasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Descargador de Videos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          YouTube, Instagram, TikTok y X — descarga directo a tu equipo, sin guardar nada en el servidor.
        </p>
      </div>
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', height: 'calc(100vh - 220px)', minHeight: 600 }}
      >
        <iframe
          src="/api/admin/video-tool-token"
          title="Descargador de Videos"
          className="w-full h-full"
          style={{ border: 0, background: 'var(--color-card)' }}
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
