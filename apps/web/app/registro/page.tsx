import Link from 'next/link';
import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { RegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

export default async function RegistroPage() {
  const session = await auth();
  // Ya logueado → ir a planes directamente
  if (session?.user?.id) redirect('/planes');

  return (
    <main className="landing" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="glow g1" />
      <div className="glow g2" />

      {/* Nav */}
      <nav style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dot">JR</span>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Academia <span style={{ color: 'var(--lp-accent)' }}>J Rubio</span></span>
        </Link>
        <Link href="/signin" className="btn btn-ghost" style={{ fontSize: 13 }}>
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </nav>

      {/* Steps */}
      <div style={{ textAlign: 'center', marginTop: 8, marginBottom: -8 }}>
        <div style={{ display: 'inline-flex', gap: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          <span style={{ padding: '4px 14px', borderRadius: '20px 0 0 20px', background: '#f97316', color: '#fff', fontWeight: 700 }}>1 Registro</span>
          <span style={{ padding: '4px 14px', background: 'rgba(255,255,255,0.08)' }}>2 Elegir plan</span>
          <span style={{ padding: '4px 14px', borderRadius: '0 20px 20px 0', background: 'rgba(255,255,255,0.08)' }}>3 Pago</span>
        </div>
      </div>

      {/* Card */}
      <div className="center-screen" style={{ flex: 1 }}>
        <div className="authcard" style={{ maxWidth: 420, width: '100%' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Crea tu cuenta</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            Accede a miles de archivos, firmware y soporte con IA.
          </p>

          {/* Google */}
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/planes' });
            }}
            style={{ marginBottom: 20 }}
          >
            <button type="submit" className="gbtn">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </button>
          </form>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>o regístrate con correo</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Email form */}
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
