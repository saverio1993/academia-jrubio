'use client';

import Link from 'next/link';
import { AIChat } from '@/app/archivos/ai-chat';

interface RecentDownload {
  id: string;
  createdAt: string;
  file: { title: string; brand: string; category: string };
}
interface NewFile {
  id: string;
  title: string;
  brand: string;
  category: string;
  sizeBytes: number | null;
  createdAt: string;
}

interface Props {
  userId: string;
  name: string;
  image: string | null;
  planName: string;
  expiresAt: string | null;
  recentDownloads: RecentDownload[];
  totalDownloads: number;
  newFiles: NewFile[];
  fileCount: number;
}

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};
const CAT_COLOR: Record<string, string> = {
  firmware: '#3b82f6', frp: '#f97316', root: '#eab308',
  drivers: '#8b5cf6', unlock: '#22c55e', dump: '#6b7280',
  tutoriales: '#ec4899', herramientas: '#14b8a6',
};

function formatBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s@]+/).filter(Boolean);
  if (!parts.length || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function SubscriberHome({
  userId, name, image, planName, expiresAt,
  recentDownloads, totalDownloads, newFiles, fileCount,
}: Props) {
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
    : null;
  const firstName = name.split(/[\s@]/)[0] ?? name;
  const expiring  = daysLeft !== null && daysLeft <= 7;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ── HERO BANNER ── */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid var(--color-border)',
          background: 'linear-gradient(160deg, rgba(249,115,22,0.10) 0%, var(--color-bg) 55%)',
        }}
      >
        {/* Orbs */}
        <div style={{
          position: 'absolute', top: -80, left: -80, width: 320, height: 320,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(249,115,22,0.20) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, right: 100, width: 240, height: 240,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 24px 44px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>

            {/* Greeting left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Avatar */}
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="avatar" style={{
                  width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
                  border: '3px solid rgba(249,115,22,0.4)',
                  boxShadow: '0 0 0 4px rgba(249,115,22,0.12)',
                }} />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 900, color: '#fff',
                  background: 'linear-gradient(135deg,#f97316,#fb923c)',
                  border: '3px solid rgba(249,115,22,0.35)',
                  boxShadow: '0 0 0 4px rgba(249,115,22,0.10)',
                }}>
                  {initials(name)}
                </div>
              )}
              <div>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 4, fontWeight: 500 }}>
                  Bienvenido de vuelta 👋
                </p>
                <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.1, margin: 0 }}>
                  {firstName}
                </h1>
                {/* Mini stat bar */}
                <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                  {[
                    { v: String(totalDownloads), l: 'descargas' },
                    { v: String(fileCount), l: 'archivos disponibles' },
                    daysLeft !== null
                      ? { v: daysLeft === 0 ? 'hoy' : `${daysLeft}d`, l: 'restantes', warn: expiring }
                      : null,
                  ].filter(Boolean).map((s) => s && (
                    <div key={s.l} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: s.warn ? '#f87171' : 'var(--color-fg)' }}>
                        {s.v}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 500 }}>{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Plan badge */}
            <div style={{
              flexShrink: 0,
              borderRadius: 20,
              border: `1px solid ${expiring ? 'rgba(248,113,113,0.4)' : 'rgba(249,115,22,0.35)'}`,
              background: expiring ? 'rgba(248,113,113,0.08)' : 'rgba(249,115,22,0.08)',
              boxShadow: expiring
                ? '0 0 30px rgba(248,113,113,0.15)'
                : '0 0 30px rgba(249,115,22,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
              padding: '16px 28px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-muted)', marginBottom: 4 }}>
                Plan activo
              </p>
              <p style={{ fontSize: 28, fontWeight: 900, color: expiring ? '#f87171' : '#f97316', lineHeight: 1, marginBottom: 6 }}>
                {planName}
              </p>
              {daysLeft !== null && (
                <p style={{ fontSize: 12, fontWeight: 600, color: expiring ? '#f87171' : 'var(--color-muted)' }}>
                  {expiring ? '⚠ ' : ''}{daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días restantes`}
                </p>
              )}
              {expiring && (
                <Link href="/planes" style={{
                  display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 700,
                  color: '#fff', background: '#f97316', borderRadius: 8, padding: '5px 14px',
                  textDecoration: 'none',
                }}>
                  Renovar →
                </Link>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── QUICK ACCESS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          {[
            {
              href: '/archivos', emoji: '📦', title: 'Biblioteca',
              desc: `${fileCount.toLocaleString()} archivos`,
              from: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.28)', dot: '#fbbf24',
            },
            {
              href: '/academia', emoji: '🎓', title: 'Academia',
              desc: 'Cursos y tutoriales',
              from: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.28)', dot: '#8b5cf6',
            },
            {
              href: '/favoritos', emoji: '🧡', title: 'Mis guardados',
              desc: 'Archivos favoritos',
              from: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.28)', dot: '#f97316',
            },
            {
              href: '/mis-descargas', emoji: '📥', title: 'Mis descargas',
              desc: `${totalDownloads} en total`,
              from: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.28)', dot: '#3b82f6',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                borderRadius: 16, border: `1px solid ${item.border}`,
                background: `linear-gradient(135deg, ${item.from}, transparent)`,
                padding: '16px 18px', textDecoration: 'none', color: 'inherit',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.02)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 24px ${item.dot}20`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '';
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, background: `${item.dot}18`, border: `1px solid ${item.dot}30`,
              }}>
                {item.emoji}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '3px 0 0', fontWeight: 500 }}>
                  {item.desc}
                </p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--color-muted)', flexShrink: 0 }}>›</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── MAIN GRID: IA + SIDEBAR ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}
          className="subscriber-grid"
        >

          {/* AI Chat */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 4, height: 18, borderRadius: 4, background: 'var(--color-accent)', flexShrink: 0 }} />
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-muted)', margin: 0 }}>
                Asistente IA — busca y descarga
              </p>
            </div>
            <AIChat userId={userId} hasSub={true} />
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Últimas descargas */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 4, height: 18, borderRadius: 4, background: '#3b82f6', flexShrink: 0 }} />
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-muted)', margin: 0 }}>
                  Últimas descargas
                </p>
              </div>
              <div style={{ borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-card)', overflow: 'hidden' }}>
                {recentDownloads.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
                    <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Aún no has descargado nada.</p>
                  </div>
                ) : (
                  recentDownloads.map((d, i) => {
                    const cc = CAT_COLOR[d.file.category] ?? '#6b7280';
                    return (
                      <div key={d.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 16px',
                        borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                          background: `${cc}18`, border: `1px solid ${cc}30`,
                        }}>
                          {CAT_ICON[d.file.category] ?? '📄'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.file.title}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--color-muted)', margin: '2px 0 0' }}>
                            {d.file.brand} · {new Date(d.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)' }}>
                  <Link href="/mis-descargas" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}>
                    Ver historial completo →
                  </Link>
                </div>
              </div>
            </div>

            {/* Nuevos archivos */}
            {newFiles.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 18, borderRadius: 4, background: '#22c55e', flexShrink: 0 }} />
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-muted)', margin: 0 }}>
                    Recién añadidos
                  </p>
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.1em', background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '2px 7px',
                  }}>
                    Nuevo
                  </span>
                </div>
                <div style={{ borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-card)', overflow: 'hidden' }}>
                  {newFiles.map((f, i) => {
                    const cc = CAT_COLOR[f.category] ?? '#6b7280';
                    return (
                      <Link
                        key={f.id}
                        href="/archivos"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 16px', textDecoration: 'none', color: 'inherit',
                          borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                          transition: 'background 0.12s',
                        }}
                        className="hover:bg-white/[0.03]"
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                          background: `${cc}18`, border: `1px solid ${cc}30`,
                        }}>
                          {CAT_ICON[f.category] ?? '📄'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.title}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--color-muted)', margin: '2px 0 0' }}>
                            {f.brand}{f.sizeBytes ? ` · ${formatBytes(f.sizeBytes)}` : ''}
                          </p>
                        </div>
                        <span style={{
                          flexShrink: 0, fontSize: 9, fontWeight: 700,
                          background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                          border: '1px solid rgba(34,197,94,0.25)', borderRadius: 5, padding: '2px 6px',
                        }}>
                          Nuevo
                        </span>
                      </Link>
                    );
                  })}
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)' }}>
                    <Link href="/archivos" style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', textDecoration: 'none' }}>
                      Ver biblioteca completa →
                    </Link>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

    </main>
  );
}
