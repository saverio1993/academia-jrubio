Eres un desarrollador full-stack senior. Vas a CONTINUAR un proyecto SaaS que YA EXISTE y está EN PRODUCCIÓN. No empieces de cero ni reescribas lo que funciona. Primero lee el archivo `CONTEXTO-PROYECTO.md` en la raíz del repo (tiene el detalle completo). Aquí va el resumen para que arranques rápido:

== PROYECTO ==
"Academia J Rubio" — plataforma SaaS para técnicos de telefonía móvil (firmware, FRP, desbloqueo, herramientas, cursos, comunidad privada). La marca es configurable.

== UBICACIÓN / DESPLIEGUE ==
- Monorepo. Repo GitHub: github.com/saverio1993/academia-jrubio
- EN VIVO en Vercel: https://academia-jrubio-web.vercel.app
- Flujo: editas código → push a GitHub (rama main) → Vercel redespliega solo. Cambiar una variable de entorno en Vercel requiere un Redeploy.

== STACK ==
Monorepo pnpm + Turborepo:
- apps/web → Next.js 15 (App Router) · React 19 · Tailwind v4 · Auth.js v5 (login Google + PrismaAdapter, sesiones "database"). ESTO es lo desplegado en Vercel.
- apps/api → NestJS (NO desplegado, solo local). EVITA depender de él: la lógica nueva ponla en Server Actions o Route Handlers de Next.js.
- packages/db → Prisma 6 · PostgreSQL en Neon.
- packages/storage → Nextcloud (WebDAV).

== CREDENCIALES ==
Todas en `.env` (raíz) y `apps/web/.env.local`. En Vercel están como Environment Variables. Nunca subas .env a repos públicos.

== GOTCHAS CRÍTICOS YA RESUELTOS (NO los rompas) ==
- Prisma en Vercel: el generator usa binaryTargets=["native","rhel-openssl-3.0.x"] y next.config.ts tiene serverExternalPackages + outputFileTracingIncludes para empaquetar el Query Engine. Sin eso falla en runtime ("could not locate the Query Engine").
- DATABASE_URL en Vercel usa la conexión POOLED de Neon (host con "-pooler" + "&pgbouncer=true"). La conexión directa satura conexiones en serverless.
- Mantener Next.js en una versión SIN CVE (Vercel bloquea versiones vulnerables).
- El sitio está FORZADO en modo oscuro (globals.css, sin media query de light). El diseño es premium: oscuro + acento naranja #f97316 + glassmorphism (clases bajo `.landing` y utilidades como `.grad-text`).
- Migraciones Prisma: aplicarlas contra el endpoint DIRECTO de Neon (no el pooled).
- El montaje/edición de archivos a veces corrompe; verifica siempre con `tsc --noEmit` antes de desplegar.

== ESTADO ACTUAL (hecho y funcionando) ==
- Login con Google ✓
- Panel admin completo ✓ (/admin): usuarios+roles, pagos (aprobar/rechazar manuales), planes, suscripciones (otorgar membresía), archivos (CRUD), cursos + examen (CRUD). Guard en apps/web/lib/admin.ts (requireAdmin/assertAdmin + logAudit en AuditLog).
- Academia completa ✓ (/academia): catálogo, detalle de curso, reproductor de lecciones (video/PDF/texto), progreso guardado, evaluaciones con nota, certificados, comentarios/Q&A. Lógica en apps/web/lib/access.ts.
- Diseño premium ✓ en landing, login y planes.
- Planes: 2 activos en Neon + Stripe (modo TEST) → biblioteca ($25/año) y pro ($50/año). El checkout es un Server Action en apps/web/app/planes/page.tsx que crea la sesión de Stripe DIRECTO (sin la API NestJS).
- Cuenta admin: saveriomanrrique19@gmail.com (rol ADMIN en la BD).

== PENDIENTE (lo que sigue) ==
1. Webhook de Stripe como Route Handler en Next.js (app/api/webhooks/stripe/route.ts) para activar la suscripción automáticamente tras el pago (hoy se activa a mano en /admin/suscripciones).
2. Descarga real de archivos de la biblioteca vía Nextcloud (generar enlaces en producción; en local existe POST /files/:id/download en la API NestJS).
3. Fase 2: bot de Telegram (al pagar → agregar al grupo privado; al expirar → quitar), IA con RAG (modelo externo Gemini/OpenAI/Claude/Ollama, responder SOLO con la base de conocimiento), Binance Pay, registro por email/Telegram + verificación por correo.
4. Fase 4: white-label (marca/logo/dominio configurables), multi-idioma, optimización a escala.
5. Operativo: integrar el logo real (hoy "JR"), pasar Stripe a llaves "live" para cobrar de verdad.

== REGLAS DE TRABAJO ==
- Respeta el patrón actual: Server Components + Server Actions, Prisma directo (import { prisma } from '@academia/db'), variables CSS para colores, helpers en apps/web/lib.
- En acciones de admin valida con assertAdmin() y registra en AuditLog.
- Verifica con typecheck antes de cada deploy. No reescribas lo que ya funciona.

Empieza confirmando en 2 líneas que entendiste el estado del proyecto, y dime qué tarea tomas primero.
