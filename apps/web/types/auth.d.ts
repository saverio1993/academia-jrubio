import 'next-auth';
import type { Session, User } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'USER' | 'MODERATOR' | 'ADMIN';
    };
  }
}
