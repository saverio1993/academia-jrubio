# Academia J Rubio

Plataforma SaaS para técnicos de telefonía móvil — biblioteca premium, comunidad Telegram, soporte con IA y academia.

> **Estado actual:** Fase 1 en progreso — auth con Google, checkout Stripe, descargas vía Nextcloud funcionando.

---

## Stack

- **Frontend:** Next.js 15 (App Router) · React 19 · Tailwind v4 · Auth.js v5
- **Backend:** NestJS 10 · TypeScript
- **DB:** PostgreSQL (Neon) · Prisma 6
- **Storage:** Nextcloud (WebDAV + OCS Share API) — abstracto
- **Pagos:** Stripe · Binance Pay (Fase 2) · Manual
- **Hosting:** Vercel (web) · Railway (api) · Fly.io (bot, Fase 2)

## Estructura

```
academia-jrubio/
├── apps/
│   ├── web/                 # Next.js 15 — landing + auth + dashboard
│   │   ├── auth.ts          # Auth.js v5 config (Google OAuth + Prisma)
│   │   ├── middleware.ts    # Protege /dashboard, /biblioteca
│   │   └── app/
│   │       ├── page.tsx           # Landing
│   │       ├── signin/            # Login
│   │       ├── dashboard/         # Área privada
│   │       └── api/auth/[...nextauth]/  # Auth.js endpoints
│   └── api/                 # NestJS — health, plans, checkout, files, webhooks
│       └── src/
│           ├── plans/             # GET /api/v1/plans
│           ├── checkout/          # POST /api/v1/checkout/session
│           ├── files/             # GET /files · POST /files/:id/download
│           ├── webhooks/          # POST /webhooks/stripe
│           └── stripe/            # Cliente Stripe compartido
├── packages/
│   ├── db/                  # Prisma + cliente exportado como @academia/db
│   │   ├── prisma/schema.prisma
│   │   ├── prisma/seed.ts          # 4 planes iniciales
│   │   └── scripts/sync-stripe.ts  # Crea productos en Stripe desde la BD
│   └── storage/             # NextcloudAdapter (WebDAV + OCS Share)
└── .github/workflows/ci.yml
```

## Setup local (10 min)

### Requisitos
- Node 20.11+
- pnpm 9.12+ → `npm install -g pnpm@9.12.0`

### Pasos
```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar entorno (Saverio te pasa el .env real)
cp .env.example .env

# 3. Build de los paquetes compartidos (debe ir antes que el resto)
pnpm --filter @academia/storage build
pnpm --filter @academia/db build
pnpm --filter @academia/db generate

# 4. Aplicar migraciones a la BD
pnpm --filter @academia/db migrate:deploy

# 5. Sembrar planes iniciales (solo la primera vez)
pnpm --filter @academia/db exec tsx prisma/seed.ts

# 6. Sincronizar planes con Stripe (solo si Stripe está vacío)
pnpm --filter @academia/db exec tsx scripts/sync-stripe.ts

# 7. Arrancar en dev
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1/health

## Endpoints implementados

### API NestJS (puerto 4000)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/plans` | Lista planes activos |
| GET | `/api/v1/plans/:slug` | Detalle de un plan |
| POST | `/api/v1/checkout/session` | Crea sesión de Stripe Checkout |
| POST | `/api/v1/webhooks/stripe` | Recibe eventos de Stripe |
| GET | `/api/v1/files` | Lista archivos (filtros: brand, category, q) |
| POST | `/api/v1/files/:id/download` | Genera share link de Nextcloud |

### Web Next.js (puerto 3000)
| Ruta | Descripción |
|---|---|
| `/` | Landing |
| `/signin` | Login con Google |
| `/dashboard` | Área privada (protegida) |
| `/api/auth/[...nextauth]` | Endpoints de Auth.js |

## Probar el login con Google

1. Asegúrate que en Google Cloud Console las **Authorized redirect URIs** incluyen:
   - `http://localhost:3000/api/auth/callback/google` (dev)
2. Levanta el sitio: `pnpm --filter @academia/web dev`
3. Abre http://localhost:3000/signin
4. Click "Continuar con Google"
5. Te redirige a Google → autorizas → vuelves a `/dashboard` con sesión
6. En Neon ver las tablas `User`, `Account`, `Session` pobladas

## Probar el checkout de Stripe

```bash
# Con la API corriendo:
curl -X POST http://localhost:4000/api/v1/checkout/session \
  -H "Content-Type: application/json" \
  -d '{"planSlug":"vip","email":"tu@email.com"}'
```

Te devuelve `{"url":"https://checkout.stripe.com/...", "sessionId":"cs_test_..."}`.
Abre la URL. Tarjeta de test: `4242 4242 4242 4242`, fecha futura, CVC cualquiera.

> Para que el webhook llegue a tu localhost necesitas Stripe CLI:
> `stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe`
> Te muestra el `STRIPE_WEBHOOK_SECRET` para pegar en `.env`.

## Probar Nextcloud

```bash
# Listar archivos:
curl http://localhost:4000/api/v1/files

# Generar share link de un archivo:
curl -X POST http://localhost:4000/api/v1/files/demo-samsung-a55/download
```

## Roadmap

- ✅ **Fase 0** — Scaffolding
- 🚧 **Fase 1 (en progreso)** — Auth ✅ · Planes ✅ · Checkout ✅ · Files ✅ · Landing visual ⏳ · Webhooks tunelados ⏳ · Admin ⏳
- ⏳ **Fase 2** — Telegram bot · IA con RAG · Binance Pay
- ⏳ **Fase 3** — Cursos · Certificados · Comunidad
- ⏳ **Fase 4** — Escala · White-label · Multi-idioma

## Convenciones

- Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Ramas: `main` (prod), `develop` (staging), `feat/<nombre>`
- Toda PR requiere CI verde

## Licencia

Propietario · Saverio Manrrique · 2026
