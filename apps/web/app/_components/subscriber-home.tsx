import Link from 'next/link';
import { AIChat } from '@/app/archivos/ai-chat';

interface RecentDownload {
  id: string;
  createdAt: Date;
  file: { title: string; brand: string; category: string };
}

interface Props {
  userId: string;
  name: string;
  planName: string;
  expiresAt: Date | null;
  recentDownloads: RecentDownload[];
}

const QUICK = [
  { icon: '📁', label: 'Archivos', desc: 'Firmware, drivers y herramientas', href: '/archivos', accent: false },
  { icon: '🎓', label: 'Cursos', desc: 'Academia y tutoriales', href: '/cursos', accent: false },
  { icon: '👤', label: 'Mi cuenta', desc: 'Perfil y suscripción', href: '/dashboard', accent: false },
];

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};

export function SubscriberHome({ userId, name, planName, expiresAt, recentDownloads }: Props) {
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400_000))
    : null;

  const displayName = name.split(' ')[0] ?? name;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="glow g1" style={{ opacity: 0.4 }} />
      <div className="glow g2" style={{ opacity: 0.3 }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 24px 60px' }}>

        {/* ── Greeting ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 4 }}>Bienvenido de vuelta</p>
            <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, lineHeight: 1.1 }}>
              {displayName} 👋
            </h1>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
            background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
            borderRadius: 12, padding: '12px 20px',
          }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plan activo</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#f97316' }}>{planName}</span>
            {daysLeft !== null && (
              <span style={{ fontSize: 12, color: daysLeft <= 7 ? '#f87171' : 'var(--color-muted)' }}>
                {daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días restantes`}
              </span>
            )}
          </div>
        </div>

        {/* ── Accesos rápidos ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 36 }}>
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              borderRadius: 12, padding: '16px 18px',
              textDecoration: 'none', color: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
              className="hover:border-[var(--color-accent)] hover:bg-white/[0.04]"
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{q.icon}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{q.label}</p>
                <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{q.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Chat + Recent downloads ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}
          className="subscriber-grid"
        >
          {/* AI Chat */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              🤖 Asistente IA — busca y descarga
            </p>
            <AIChat userId={userId} hasSub={true} />
          </div>

          {/* Recent downloads */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              📥 Últimas descargas
            </p>
            <div style={{ borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-card)', overflow: 'hidden' }}>
              {recentDownloads.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                  Aún no has descargado nada.<br />
                  <span style={{ fontSize: 11 }}>Usa el chat para buscar archivos.</span>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {recentDownloads.map((d, i) => (
                    <li key={d.id} style={{
                      padding: '12px 16px',
                      borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>
                        {CAT_ICON[d.file.category] ?? '📄'}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.file.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
                          {d.file.brand} · {new Date(d.createdAt).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)' }}>
                <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none' }}>
                  Ver historial completo →
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
