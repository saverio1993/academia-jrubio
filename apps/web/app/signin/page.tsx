import Link from 'next/link';
import { LoginForm, GoogleSignInButton } from './login-form';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <main className="landing" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="glow g1" />
      <div className="glow g2" />

      <nav style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dot">JR</span>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Academia <span style={{ color: 'var(--lp-accent)' }}>J Rubio</span></span>
        </Link>
        <Link href="/registro" className="btn btn-ghost" style={{ fontSize: 13 }}>
          ¿No tienes cuenta? Regístrate
        </Link>
      </nav>

      <div className="center-screen" style={{ flex: 1 }}>
        <div className="authcard" style={{ maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Iniciar sesión</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            Accede a tu cuenta de Academia J Rubio.
          </p>

          {/* Google — client-side para compatibilidad móvil */}
          <div style={{ marginBottom: 20 }}>
            <GoogleSignInButton />
          </div>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>o con tu correo</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Email/password form */}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
