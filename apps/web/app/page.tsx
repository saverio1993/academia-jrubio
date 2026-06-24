import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { RevealOnScroll } from './_components/reveal';
import { TopNav } from '@/components/top-nav';
import { SubscriberHome } from './_components/subscriber-home';

export const dynamic = 'force-dynamic';

const BENEFITS = [
  { ic: '📦', t: 'Archivos y firmware', d: 'Descarga firmware oficial, drivers y paquetes para todas las marcas, siempre actualizados.' },
  { ic: '🛠️', t: 'Herramientas pro', d: 'Las herramientas que usan los profesionales para FRP, IMEI, flasheo y desbloqueo.' },
  { ic: '🎓', t: 'Tutoriales y cursos', d: 'Academia con videos, PDFs, evaluaciones y certificados para dominar cada procedimiento.' },
  { ic: '💬', t: 'Soporte privado', d: 'Comunidad exclusiva en Telegram Premium donde resolvemos tus dudas en minutos.' },
  { ic: '🤖', t: 'IA especializada', d: 'Pregúntale al bot: "firmware Samsung A55" o "cómo quitar FRP en A34" y responde al instante.' },
  { ic: '⚡', t: 'Acceso inmediato', d: 'Al suscribirte entras automáticamente al grupo privado y a toda la biblioteca.' },
];

const TESTIMONIALS = [
  { av: 'CM', nm: 'Carlos M.', rl: 'Técnico · Colón', q: 'Encontré el firmware que llevaba días buscando en 2 minutos. La comunidad es oro puro.' },
  { av: 'JR', nm: 'José R.', rl: 'Reparación móvil · David', q: 'El bot de IA me resolvió un FRP de Samsung sin tener que preguntar a nadie. Brutal.' },
  { av: 'AP', nm: 'Ana P.', rl: 'Taller técnico · Panamá', q: 'Pasé de responder por Messenger a tener mis clientes en la plataforma. Me cambió el negocio.' },
];

export default async function HomePage() {
  const session = await auth();
  const logged = Boolean(session?.user);

  // ── Suscriptor: mostrar dashboard personalizado ──────────────────────────
  if (session?.user?.id) {
    const activeSub = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' },
      select: { expiresAt: true, plan: { select: { name: true } } },
    });

    if (activeSub) {
      const recentDownloads = await prisma.download.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          createdAt: true,
          file: { select: { title: true, brand: true, category: true } },
        },
      });

      return (
        <>
          <TopNav />
          <SubscriberHome
            userId={session.user.id}
            name={session.user.name ?? session.user.email ?? 'Técnico'}
            planName={activeSub.plan.name}
            expiresAt={activeSub.expiresAt}
            recentDownloads={recentDownloads}
          />
        </>
      );
    }
  }

  // ── Visitante / sin plan: landing page ──────────────────────────────────
  const [userCount, fileCount, downloadCount, subCount] = await Promise.all([
    prisma.user.count(),
    prisma.fileItem.count(),
    prisma.download.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
  ]);

  const STATS = [
    { n: userCount.toLocaleString('es'), l: 'Usuarios registrados' },
    { n: fileCount.toLocaleString('es'), l: 'Archivos disponibles' },
    { n: downloadCount.toLocaleString('es'), l: 'Descargas realizadas' },
    { n: subCount.toLocaleString('es'), l: 'Suscripciones activas' },
  ];

  return (
    <main className="landing">
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="glow g3" />

      <TopNav />

      <header className="hero wrap">
        <div className="reveal in">
          <span className="eyebrow"><span className="pulse" /> Plataforma técnica · Panamá</span>
          <h1>
            El centro de los<br />
            <span className="grad">técnicos de telefonía móvil</span>
          </h1>
          <p className="sub">
            Accede a miles de archivos, firmware, herramientas profesionales, tutoriales y soporte con
            inteligencia artificial — todo en un solo lugar.
          </p>
          <div className="cta">
            <Link className="btn btn-primary btn-lg" href="/planes">Suscríbete ahora →</Link>
            <Link className="btn btn-ghost btn-lg" href={logged ? '/dashboard' : '/signin'}>
              {logged ? 'Ir a mi cuenta' : 'Ya tengo cuenta'}
            </Link>
          </div>
          <p className="trust">✓ Sin permanencia · ✓ Acceso inmediato · ✓ Comunidad privada en Telegram</p>
        </div>

        <div className="heroframe reveal">
          <div className="bar"><span /><span /><span /></div>
          <div className="screen">
            {STATS.map((s) => (
              <div className="miniStat" key={s.l}>
                <div className="n">{s.n}</div>
                <div className="l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section id="beneficios" className="wrap">
        <div className="stitle reveal">
          <span className="tag">Todo incluido</span>
          <h2>Todo lo que un técnico necesita</h2>
          <p>Deja de buscar en mil grupos. Aquí tienes recursos verificados y soporte real.</p>
        </div>
        <div className="grid3">
          {BENEFITS.map((b) => (
            <div className="feat reveal" key={b.t}>
              <div className="ic">{b.ic}</div>
              <h3>{b.t}</h3>
              <p>{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planes" className="wrap">
        <div className="stitle reveal">
          <span className="tag">Planes</span>
          <h2>Elige tu acceso</h2>
          <p>Cancela cuando quieras. Todos los planes incluyen la comunidad de Telegram.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, maxWidth: 760, margin: '0 auto', alignItems: 'start' }}>
          <div className="plan reveal">
            <div className="pn">Biblioteca</div>
            <div className="price">$25<span>/año</span></div>
            <p className="pdesc">Acceso a toda la nube de archivos.</p>
            <ul>
              <li><span className="ck">✓</span> Acceso completo a la biblioteca de archivos</li>
              <li><span className="ck">✓</span> Firmware, drivers, herramientas y tutoriales</li>
              <li><span className="ck">✓</span> Descargas ilimitadas</li>
              <li><span className="ck">✓</span> Buscador avanzado por marca y modelo</li>
            </ul>
            <Link className="btn btn-ghost" href="/planes">Empezar</Link>
          </div>
          <div className="plan pop reveal">
            <span className="badge">Más popular</span>
            <div className="pn">Pro</div>
            <div className="price">$50<span>/año</span></div>
            <p className="pdesc">Todo, con soporte humano y comunidad.</p>
            <ul>
              <li><span className="ck">✓</span> Todo lo del plan Biblioteca</li>
              <li><span className="ck">✓</span> Comunidad privada en Telegram</li>
              <li><span className="ck">✓</span> Soporte directo con el instructor (1 a 1)</li>
              <li><span className="ck">✓</span> Academia: cursos, evaluaciones y certificados</li>
              <li><span className="ck">✓</span> Soporte prioritario</li>
            </ul>
            <Link className="btn btn-primary" href="/planes">Suscribirme</Link>
          </div>
        </div>
      </section>

      <section id="opiniones" className="wrap">
        <div className="stitle reveal">
          <span className="tag">Opiniones</span>
          <h2>Técnicos que ya confían</h2>
        </div>
        <div className="tgrid">
          {TESTIMONIALS.map((t) => (
            <div className="tcard reveal" key={t.nm}>
              <div className="stars">★★★★★</div>
              <p>{t.q}</p>
              <div className="who">
                <div className="av">{t.av}</div>
                <div>
                  <div className="nm">{t.nm}</div>
                  <div className="rl">{t.rl}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap">
        <div className="finalcta reveal">
          <h2>Lleva tu taller al siguiente nivel</h2>
          <p>Únete a miles de técnicos que ya tienen sus archivos, cursos y soporte en un solo lugar.</p>
          <Link className="btn btn-primary btn-lg" href="/planes">
            {logged ? 'Ver planes →' : 'Crear mi cuenta →'}
          </Link>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: 14 }}>
            <span className="dot">JR</span> Academia <span style={{ color: 'var(--lp-accent)' }}>J Rubio</span>
          </div>
          © 2026 Academia J Rubio · Plataforma técnica de telefonía móvil · Panamá
        </div>
      </footer>

      <RevealOnScroll />
    </main>
  );
}
