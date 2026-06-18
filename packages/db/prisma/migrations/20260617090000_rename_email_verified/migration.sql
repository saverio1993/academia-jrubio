-- Renombra la columna al nombre estándar que requiere @auth/prisma-adapter
ALTER TABLE "User" RENAME COLUMN "emailVerifiedAt" TO "emailVerified";
