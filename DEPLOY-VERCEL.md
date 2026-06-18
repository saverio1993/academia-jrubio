# Desplegar Academia J Rubio en Vercel

Esta guía pone la **web** (Next.js) en línea con Vercel, gratis, conectada a tu repo de GitHub. La base de datos sigue en Neon. La **API NestJS** (Stripe) se despliega aparte después (ver sección final).

---

## Paso 0 — Subir los cambios de configuración

Acabo de agregar dos archivos para que Vercel sepa construir el monorepo:
- `apps/web/vercel.json` (comando de build)
- `postinstall` en `packages/db/package.json` (genera Prisma en cada install)

**Vuelve a ejecutar `SUBIR-A-GITHUB.bat`** para que estos cambios lleguen a GitHub.

---

## Paso 1 — Crear proyecto en Vercel

1. Entra a **https://vercel.com** y haz **Sign Up con GitHub** (usa tu cuenta `saverio1993`).
2. Clic en **Add New… → Project**.
3. Importa el repo **`saverio1993/academia-jrubio`**.

## Paso 2 — Configurar el proyecto (IMPORTANTE)

En la pantalla de configuración del import:

- **Root Directory:** clic en *Edit* y selecciona **`apps/web`**. ⚠️ Esto es clave en un monorepo.
- **Framework Preset:** debe quedar **Next.js** (automático).
- **Build & Install Command:** déjalos en automático (el `apps/web/vercel.json` ya los define).

## Paso 3 — Variables de entorno

Antes de hacer *Deploy*, abre **Environment Variables** y agrega estas (copia los valores de tu archivo `.env` local). 

| Variable | Valor |
|---|---|
| `DATABASE_URL` | (el de tu `.env` — el de Neon) |
| `AUTH_SECRET` | (el de tu `.env`) |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_GOOGLE_ID` | (el de tu `.env`) |
| `AUTH_GOOGLE_SECRET` | (el de tu `.env`) |
| `APP_NAME` | `Academia J Rubio` |
| `NEXTCLOUD_URL` | `https://cloud.heyvalue.com` |
| `NEXTCLOUD_USER` | (el de tu `.env`) |
| `NEXTCLOUD_APP_PASSWORD` | (el de tu `.env`) |
| `NEXTCLOUD_BASE_PATH` | `/AcademiaJRubio/files` |
| `STRIPE_SECRET_KEY` | (el de tu `.env`) |
| `STRIPE_PUBLISHABLE_KEY` | (el de tu `.env`) |
| `STRIPE_WEBHOOK_SECRET` | (déjalo vacío por ahora) |

> `AUTH_URL` y `APP_URL` los agregamos en el Paso 5 (cuando ya conozcas tu dominio de Vercel).
> **No** agregues `NODE_ENV` (Vercel lo pone solo).

Luego clic en **Deploy** y espera a que termine (2–4 min).

## Paso 4 — Tu dominio

Al terminar, Vercel te da una URL tipo **`https://academia-jrubio.vercel.app`**. Cópiala.

## Paso 5 — Terminar la config de login (Google)

El login con Google necesita conocer tu dominio:

1. En **Vercel → Settings → Environment Variables**, agrega:
   - `AUTH_URL` = `https://TU-DOMINIO.vercel.app`
   - `APP_URL` = `https://TU-DOMINIO.vercel.app`
2. En **Google Cloud Console** (https://console.cloud.google.com → APIs y servicios → Credenciales → tu cliente OAuth):
   - **Authorized JavaScript origins:** agrega `https://TU-DOMINIO.vercel.app`
   - **Authorized redirect URIs:** agrega `https://TU-DOMINIO.vercel.app/api/auth/callback/google`
3. En Vercel, ve a **Deployments → … → Redeploy** para que tome las nuevas variables.

Después de esto, podrás entrar a tu sitio en línea, iniciar sesión con Google y usar Academia, dashboard y el panel admin. 🎉

---

## Recomendación: conexión Neon para serverless

Vercel ejecuta funciones serverless. Para evitar agotar conexiones a Postgres, usa la **cadena de conexión "Pooled"** de Neon:
- En el panel de Neon → tu proyecto → **Connection string** → activa **"Pooled connection"**.
- Usa ese valor (incluye `-pooler` en el host) en `DATABASE_URL` de Vercel.

No es obligatorio para empezar, pero evita errores de "too many connections" cuando tengas tráfico.

---

## La API NestJS (Stripe) — paso siguiente

Vercel hospeda la **web**, pero la **API NestJS** (`apps/api`) es un servidor que necesita su propio hosting. Mientras no esté desplegada:
- ✅ Funcionan: login, Academia (cursos, lecciones, examen, certificados, comentarios), dashboard, panel admin (todo usa Prisma directo).
- ❌ No funcionan todavía: el **checkout de Stripe** y los **webhooks de pago** (dependen de la API).

Para activarlos, desplegamos `apps/api` en **Railway** o **Render** (gratis para empezar), ponemos su URL en la variable `API_URL` de Vercel, y configuramos el webhook de Stripe hacia esa URL. Cuando llegues aquí, avísame y te guío.

---

## Si el build falla en Vercel
- Error de Prisma ("did not initialize"): confirma que el commit incluye el `postinstall` en `packages/db/package.json`.
- Error "module @academia/db not found": confirma **Root Directory = apps/web** y que `apps/web/vercel.json` esté en el repo.
- Manda captura del log y lo revisamos.
