import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@academia/db';
import { verifyPassword } from '@/lib/password';
import { validateTelegramInitData } from '@/lib/telegram';

function makeUsername(email: string): string {
  return email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
}

async function uniqueUsername(base: string, excludeId?: string): Promise<string> {
  let username = base;
  let n = 1;
  while (true) {
    const existing = await prisma.user.findFirst({
      where: { username, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return username;
    username = `${base}${n++}`;
  }
}

/* Cookies OAuth: deben sobrevivir el redirect chain app→Google→app.
   iOS Safari (ITP) corrompe o descarta cookies con SameSite=Lax al pasar
   por un dominio de tracking conocido (google.com).
   Con SameSite=None;Secure las enviamos en todos los contextos de navegación. */
const oauthCookieOpts = {
  httpOnly: true,
  sameSite: 'none' as const,
  secure: true,
  path: '/',
  maxAge: 60 * 15, // 15 minutos — suficiente para completar el OAuth
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  debug: false,
  trustHost: true,
  logger: {
    error(error) {
      console.error('====== AUTH ERROR ======', error.name, error.message);
    },
    warn(code) { console.warn('[auth][warn]', code); },
  },
  cookies: {
    state: {
      name: '__Secure-authjs.state',
      options: oauthCookieOpts,
    },
    pkceCodeVerifier: {
      name: '__Secure-authjs.pkce.code_verifier',
      options: oauthCookieOpts,
    },
    nonce: {
      name: '__Secure-authjs.nonce',
      options: oauthCookieOpts,
    },
    callbackUrl: {
      name: '__Secure-authjs.callback-url',
      options: oauthCookieOpts,
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
      // PKCE no necesario con clientSecret; evita el bug de iOS con cookies PKCE
      checks: ['state'],
    }),
    Credentials({
      credentials: {
        email:    { label: 'Email',      type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const email    = String(credentials?.email    ?? '').trim().toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, image: true, passwordHash: true },
        });
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) return null;

        return { id: user.id, email: user.email!, name: user.name, image: user.image };
      },
    }),
    Credentials({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        initData: { label: 'Telegram Init Data', type: 'text' },
      },
      async authorize(credentials) {
        const initData = String(credentials?.initData ?? '');
        if (!initData) return null;

        const tgUser = validateTelegramInitData(initData);
        if (!tgUser) return null;

        const user = await prisma.user.findUnique({
          where: { telegramId: String(tgUser.id) },
          select: { id: true, email: true, name: true, image: true },
        });
        if (!user?.email) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  pages: { signIn: '/signin' },
  events: {
    // Se llama solo la primera vez que el usuario se registra
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const updates: Record<string, string> = {};

      // Generar username único desde el email
      if (!user.name) updates.name = user.email.split('@')[0] ?? 'Usuario';

      const base = makeUsername(user.email);
      updates.username = await uniqueUsername(base, user.id);

      if (Object.keys(updates).length) {
        await prisma.user.update({ where: { id: user.id }, data: updates });
      }
    },
    // Cada vez que inicia sesión — sincroniza nombre/imagen si fue creado por admin sin datos
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.id) return;
      const existing = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, username: true },
      });
      if (!existing) return;

      const updates: Record<string, string> = {};
      if (!existing.name && user.name) updates.name = user.name;
      if (!existing.username && user.email) {
        const base = makeUsername(user.email);
        updates.username = await uniqueUsername(base, user.id);
      }
      if (Object.keys(updates).length) {
        await prisma.user.update({ where: { id: user.id }, data: updates });
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: 'USER' | 'MODERATOR' | 'ADMIN' }).role ?? 'USER';
      }
      return session;
    },
  },
});
