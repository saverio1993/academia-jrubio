import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@academia/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  debug: true,
  trustHost: true,
  logger: {
    error(error) {
      console.error('====== AUTH ERROR ======');
      console.error('Name:', error.name);
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      if (error.cause) console.error('Cause:', error.cause);
      console.error('========================');
    },
    warn(code) {
      console.warn('[auth][warn]', code);
    },
    debug(code, metadata) {
      console.log('[auth][debug]', code, metadata);
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: '/signin',
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
