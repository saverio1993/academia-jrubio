# Academia J Rubio — Documento de contexto y handoff

> **Para la IA que continúe el proyecto (MINIMAX M3 u otra):** este archivo resume TODO lo construido, la arquitectura, las conexiones/credenciales y cómo seguir. Las credenciales reales (tokens, contraseñas) **ya están en los archivos `.env` (raíz) y `apps/web/.env.local`** de esta misma carpeta — léelos para obtener los valores completos. Aquí se documenta qué es cada cosa y para qué sirve.

Última actualización del contexto: junio 2026. Propietario: **Saverio Manrrique** (`saveriomanrrique19@gmail.com`).

---

## 1. Qué es el proyecto

Plataforma SaaS premium para **técnicos de telefonía móvil** (desbloqueo, FRP, flasheo, firmware, reparación de software). El objetivo de negocio: dejar de responder a mano por Messenger y dirigir a los clientes a una plataforma donde se suscriben y acceden a archivos, herramientas, cursos, comunidad (Telegram) y soporte con IA.

La marca es **configurable** (nombre comercial, logo, dominio). Actualmente:
- Nombre comercial: **Academia J Rubio** (variable `APP_NAME` en `.env`).
- La cuenta/negocio del dueño aparece como **"TÉCNICOS UNIDOS INTERNACIONAL"** (nombre del usuario en la BD).
- Logo: archivo PNG del círculo azul "TÉCNICOS UNIDOS INTERNACIONAL" (está en la carpeta `plataforma de tecnicos unidos int`). Aún no está integrado en el header del sitio; el diseño usa texto "Academia **J Rubio**".

---

## 2. Stack y arquitectura

Monorepo **pnpm + Turborepo**. Node 20.11+ / pnpm 9.12.

```
academia-jrubio/
├── apps/
│   ├── web/   → Next.js 15 (App Router) · React 19 · Tailwind v4 · Auth.js v5 (NextAuth) · puerto 3000
│   └── api/   → NestJS 10 (TypeScript) · puerto 4000, prefijo /api/v1
├── packages/
│   ├── db/        → Prisma 6 + cliente compartido (@academia/db). Esquema y migraciones aquí.
│   └── storage/   → Adaptador Nextcloud WebDAV (@academia/storage)
├── .env             → credenciales reales (raíz) — lo lee la API (NestJS)
├── apps/web/.env.local → mismas credenciales para Next.js
└── INICIAR.bat      → lanzador local para Windows (ver sección 7)
```

- **Frontend (web):** la mayoría de la lógica nueva está hecha con **Server Components + Server Actions** (no se crean endpoints API nuevos para el panel/academia; se consulta Prisma directo en componentes de servidor y se muta con server actions). Diseño oscuro con acento naranja.
- **Backend (api, NestJS):** maneja planes, checkout de Stripe, webhooks de Stripe, listado/descarga de archivos (Nextcloud) y health. Útil para integraciones externas y futuro bot.
- **Base de datos:** PostgreSQL en **Neon** (nube). Prisma como ORM.
- **Almacenamiento de archivos pesados:** **Nextcloud** vía WebDAV (no se guardan archivos en el servidor). El adaptador genera enlaces de descarga.
- **Pagos:** **Stripe** (modo test). Binance Pay y PayPal están previstos pero NO implementados.
- **Auth:** Auth.js v5 con **Google OAuth** y sesiones tipo *database* (PrismaAdapter).

### Diseño / tokens visuales (CSS variables, en `apps/web/app/globals.css`)
```
--color-bg: #0a0a0b      (oscuro; claro automático con prefers-color-scheme)
--color-fg: #fafafa
--color-muted: #71717a
--color-accent: #f97316      (naranja, color de marca)
--color-accent-hover: #ea580c
--color-border: #27272a
--color-card: #18181b
--font-sans: Geist / Inter / system-ui
--radius: 0.5rem
```
Helpers UI reutilizables del panel admin: `apps/web/app/admin/_components/ui.tsx` (Card, StatCard, Badge, Table, botones). Formato: `apps/web/lib/format.ts` (money, fechas, bytes, daysLeft).

---

## 3. Conexiones y credenciales (qué es cada una)

> Los **valores secretos completos están en `.env` (raíz) y `apps/web/.env.local`**. Aquí se explica cada conexión. Nunca subas estos archivos a un repo público.

| Servicio | Variables de entorno | Para qué | Notas |
|---|---|---|---|
| **Neon (PostgreSQL)** | `DATABASE_URL` | Base de datos principal | Host `ep-lingering-frost-adwyki19...neon.tech`, base `neondb`, usuario `neondb_owner`. `sslmode=require`. |
| **Google OAuth** | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Login con Google | Client ID `1026156617111-...apps.googleusercontent.com`. En Google Cloud Console el **redirect URI** debe incluir `http://localhost:3000/api/auth/callback/google`. |
| **Auth.js / NextAuth** | `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` | Firma de sesión | `AUTH_SECRET` es un valor dev; cámbialo en producción (`openssl rand -base64 32`). |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Pagos con tarjeta | Llaves **test** (`sk_test_...`, `pk_test_...`). Los 4 planes ya están sincronizados con Stripe (tienen `stripePriceId`). Para webhooks locales: `stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe` y pegar el secret en `STRIPE_WEBHOOK_SECRET`. |
| **Nextcloud (WebDAV)** | `NEXTCLOUD_URL`, `NEXTCLOUD_USER`, `NEXTCLOUD_APP_PASSWORD`, `NEXTCLOUD_BASE_PATH` | Almacenamiento de archivos/firmware | URL `https://cloud.heyvalue.com`, base `/AcademiaJRubio/files`. El password es un "App Password" de Nextcloud. |
| **App** | `APP_NAME`, `APP_URL`, `API_URL`, `NODE_ENV` | Config general / marca | `APP_NAME` controla el nombre comercial mostrado. |

**Pendientes de conectar (Fase 2, variables ya previstas en `.env.example`):** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `REDIS_URL` (Upstash), `RESEND_API_KEY` (emails). Estas todavía NO tienen valor.

---

## 4. Modelo de datos (Prisma — `packages/db/prisma/schema.prisma`)

Tablas actuales en Neon:

- **Auth/usuarios:** `User` (con rol USER/MODERATOR/ADMIN, teléfono, país, telegramId), `Account`, `Session`, `VerificationToken`.
- **Planes y suscripciones:** `Plan` (slug, precio en centavos, ciclo MONTHLY/QUARTERLY/YEARLY/LIFETIME, features JSON, stripeProductId/stripePriceId, campos Telegram), `Subscription` (estado ACTIVE/PAST_DUE/CANCELED/EXPIRED/SUSPENDED, fechas inicio/vencimiento).
- **Pagos:** `Payment` (provider STRIPE/BINANCE_PAY/PAYPAL/MANUAL, estado PENDING/SUCCEEDED/FAILED/REFUNDED/AWAITING_APPROVAL/REJECTED, `proofUrl` para comprobante manual, aprobador).
- **Biblioteca:** `FileItem` (marca, modelo, categoría, subcategoría, `storageKey` en Nextcloud, isPremium, tags), `Download`.
- **Auditoría:** `AuditLog` (actorId, action, target, metadata) — registra todas las acciones admin.
- **Academia / Fase 3:** `Course`, `Lesson` (tipo VIDEO/PDF/TEXT, videoUrl, storageKey, contentText, isFreePreview), `Enrollment`, `LessonProgress`, `Certificate` (código único), `Quiz` (passingScore), `QuizQuestion` (options JSON, correctIndex), `QuizAttempt` (score, passed), `LessonComment` (con respuestas anidadas vía parentId).

**Migraciones aplicadas (en orden):**
1. `20260617084034_init`
2. `20260617084850_add_stripe_ids_to_plan`
3. `20260617090000_rename_email_verified`
4. `20260617120000_phase3_courses`
5. `20260617130000_phase3_progress`
6. `20260617140000_phase3_quiz_comments`

Todas están en `packages/db/prisma/migrations/` y ya corrieron en Neon. Para nuevas migraciones desde un entorno limpio: editar el schema y usar `prisma migrate dev` (o `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel schema.prisma --script` para generar el SQL y luego `prisma migrate deploy`).

---

## 5. Funcionalidad construida (rutas)

### Sitio público / alumno (`apps/web/app/`)
- `/` landing · `/signin` (login Google) · `/planes` · `/dashboard` (área privada: suscripción, descargas, pagos; muestra enlaces a Academia y, si eres ADMIN, al Panel admin).
- `/checkout/success` retorno de Stripe.
- **Academia (`/academia`):**
  - `/academia` catálogo de cursos publicados con progreso.
  - `/academia/[slug]` detalle del curso: lista de lecciones, candado en premium, inscripción, barra de progreso, acceso al examen y certificado.
  - `/academia/[slug]/[lessonId]` reproductor: video embebido (YouTube/Vimeo), PDF o texto; marcar lección completada; navegación; **sección de comentarios/Q&A** con respuestas (admin aparece como "Instructor").
  - `/academia/[slug]/examen` tomar la evaluación (opción múltiple), calificación automática, reintento, certificado si aprueba.
  - `/academia/[slug]/certificado` certificado al 100% (imprimible a PDF).

### Panel administrativo (`/admin`, solo rol ADMIN)
- `/admin` dashboard con métricas (usuarios, suscripciones activas, pagos por aprobar, ingresos, archivos, descargas) + actividad reciente.
- `/admin/usuarios` listar/buscar y cambiar rol.
- `/admin/pagos` aprobar/rechazar pagos manuales (con comprobante), filtros por estado.
- `/admin/suscripciones` cambiar estado/vencimiento y **otorgar membresía manual** (usuario + plan + días).
- `/admin/planes` crear/editar planes (precio, ciclo, activar).
- `/admin/archivos` CRUD de la biblioteca (marca, categoría, ruta Nextcloud, premium, tags).
- `/admin/cursos` lista/crear cursos · `/admin/cursos/[id]` editar curso + CRUD de lecciones · `/admin/cursos/[id]/examen` gestionar el examen (preguntas, nota mínima).

Seguridad del admin: `apps/web/lib/admin.ts` → `requireAdmin()` / `assertAdmin()` revalidan el rol contra la BD; `logAudit()` escribe en `AuditLog`. Acceso a cursos premium controlado en `apps/web/lib/access.ts` (`hasActiveSubscription`, `canAccessCourse`, `syncCertificate`).

### API NestJS (`apps/api`, puerto 4000, prefijo `/api/v1`)
- `GET /health` · `GET /plans` · `GET /plans/:slug` · `POST /checkout/session` · `POST /webhooks/stripe` · `GET /files` · `POST /files/:id/download`.

---

## 6. Cuenta y datos de prueba ya sembrados
- **Admin:** la cuenta de Saverio (`saveriomanrrique19@gmail.com`) tiene rol **ADMIN**.
- **Planes:** 4 (mensual $9.99, anual $99.90, premium $149.90, vip $249.90) con Stripe price IDs.
- **Archivo demo:** "Firmware Samsung Galaxy A55".
- **Curso demo:** slug `frp-samsung-basico` — "Eliminación de FRP en Samsung (Básico)", 4 lecciones (1 vista previa gratis) + **examen demo de 3 preguntas**.

---

## 7. Cómo arrancarlo localmente (Windows)

1. Doble clic en **`INICIAR.bat`** (en la raíz del proyecto). Ese script: asegura pnpm, compila `@academia/storage`, ejecuta `prisma generate`, compila `@academia/db` y luego `pnpm dev` (levanta web + api). Abre el navegador en `http://localhost:3000`.
   - Web: http://localhost:3000 · API: http://localhost:4000/api/v1/health
2. Para detener: cerrar la ventana negra (consola).
3. **Importante:** si cambias el schema de Prisma, hay que reiniciar (cerrar y volver a abrir `INICIAR.bat`) para que regenere el cliente.

Requisitos: Node 20.11+, pnpm 9.12 (el `.bat` lo instala si falta). El `node_modules` ya está instalado con binarios de Windows.

---

## 8. Estado por fases (roadmap)

- ✅ **Fase 1** — Auth Google, planes, checkout Stripe, biblioteca de archivos (Nextcloud), dashboard, **panel administrativo completo**.
- ⏳ **Fase 2 (siguiente, NO empezada)** — **Bot de Telegram** (al pagar se agrega al grupo privado; al expirar se elimina) · **IA con RAG** (búsqueda en archivos/manuales con Gemini/Claude/Ollama) · **Binance Pay**. Variables de entorno previstas pero vacías (ver sección 3).
- ✅ **Fase 3 — COMPLETA** — Academia: cursos, lecciones (video/PDF/texto), inscripción, **progreso guardado**, **evaluaciones** (examen con nota), **certificados** (al completar lecciones + aprobar examen) y **comunidad** (comentarios/Q&A por lección).
- ⏳ **Fase 4** — Escalabilidad, white-label (marca/logo/dominio configurables para revender), multi-idioma.

---

## 9. Recomendaciones para continuar (para MINIMAX M3)

- **Fase 2 — Telegram:** crear un bot con @BotFather, poner el token en `TELEGRAM_BOT_TOKEN`. Lo natural es un servicio aparte (puede vivir en `apps/bot` o dentro de la API NestJS). El schema de `Plan` ya tiene `telegramGroupId` y `telegramInviteLink`, y `User` tiene `telegramId`/`telegramHandle`. Al aprobarse un pago / activarse una suscripción → agregar al grupo; al expirar → quitar. La API ya recibe webhooks de Stripe (`apps/api/src/webhooks/stripe-webhook.controller.ts`), buen punto de enganche.
- **Fase 2 — IA con RAG:** la fuente de conocimiento son los `FileItem`, lecciones y manuales. Implementar embeddings + búsqueda vectorial (pgvector en Neon es opción) y responder solo con esa base. Llaves previstas: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` (o Ollama local).
- **Patrón de código:** seguir el estilo actual — Server Components + Server Actions en `web`, Prisma directo, helpers en `apps/web/lib/`, UI con las variables CSS y `_components/ui.tsx`. Validar siempre el rol con `assertAdmin()` en acciones de admin y registrar en `AuditLog`.
- **Logo/marca:** para white-label, exponer `APP_NAME`/logo desde config y reemplazar los textos "Academia J Rubio" del header (`layout.tsx` de admin y academia, landing `page.tsx`).
- **Descarga de PDFs de lecciones:** hoy si el `storageKey` empieza con `http` se enlaza directo; si es una ruta de Nextcloud se muestra el path. Falta generar el enlace de descarga vía el adaptador `@academia/storage` (ya existe para `FileItem` en la API: `POST /files/:id/download`). Conviene crear un endpoint equivalente para lecciones.

---

## 10. Notas finales
- Repo sin git inicializado todavía (se puede `git init`). Ramas sugeridas: `main` (prod), `develop`, `feat/<nombre>`.
- Hosting previsto: Vercel (web), Railway (api), Fly.io (bot Fase 2).
- Toda la información sensible vive en `.env` y `apps/web/.env.local`. Si vas a compartir el proyecto, no incluyas esos archivos.
