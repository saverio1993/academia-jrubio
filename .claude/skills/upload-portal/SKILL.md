---
name: upload-portal
description: Gestionar el portal de subida de archivos grandes a Nextcloud (HeyValue). Úsalo cuando el usuario quiera cambiar el tamaño de partes, ajustar la configuración, corregir errores de subida, o entender cómo funciona el sistema de upload.
---

# Upload Portal — Academia J Rubio

Portal de subida directa a Nextcloud en HeyValue, sin pasar por Vercel.

## Arquitectura

```
Browser (admin panel / portal) → Render.com (Express) → Nextcloud HeyValue
                                  academia-jrubio.onrender.com    cloud.heyvalue.com
```

**Por qué Render y no Vercel:**
- Vercel tiene límite de 4.5 MB por request y timeout de 60-90s
- Render no tiene límite de body ni timeout corto para uploads
- Cloudflare Worker también tiene timeout de 100s en el plan gratuito

## Archivos clave

| Archivo | Función |
|---|---|
| `apps/upload-portal/server.js` | Servidor Express en Render — recibe y reenvía a Nextcloud |
| `apps/upload-portal/public/index.html` | UI del portal separado (academia-jrubio.onrender.com) |
| `apps/web/app/admin/archivos/file-upload-input.tsx` | Componente de upload en el panel admin de Vercel |

## Variables de entorno

### En Render.com (para el servidor Express):
```
NEXTCLOUD_URL=https://cloud.heyvalue.com
NEXTCLOUD_USER=8202944a-6bb4-49f3-9e06-a4a5849813f2
NEXTCLOUD_APP_PASSWORD=TH6Te-d7pXo-8yTKw-xDk4f-co98P
NEXTCLOUD_BASE_PATH=AcademiaJRubio/files
UPLOAD_TOKEN=academia2024
```

### En Vercel (para el panel admin):
```
NEXT_PUBLIC_RENDER_UPLOAD_URL=https://academia-jrubio.onrender.com
NEXT_PUBLIC_RENDER_UPLOAD_TOKEN=academia2024
```

## Lógica de subida por partes (chunked upload)

Para archivos grandes, el sistema divide el archivo en partes y usa la API de chunked upload de Nextcloud:

1. `POST /start-upload?folder=X&filename=Y` → crea sesión MKCOL en `/dav/uploads/`
2. `PUT /upload-chunk?uploadId=X&offset=Y` × N → sube cada parte (actualmente 80 MB)
3. `POST /finish-upload` → MOVE en Nextcloud para ensamblar el archivo final

Archivos ≤ 80 MB van por `PUT /upload` directo (sin chunked).

## Cambiar tamaño de las partes

**En el portal standalone** (`apps/upload-portal/public/index.html`):
```javascript
const CHUNK_SIZE = 80 * 1024 * 1024; // ← cambiar este número (en MB)
```

**En el panel admin** (`apps/web/app/admin/archivos/file-upload-input.tsx`):
```typescript
const CHUNK_SIZE = 80 * 1024 * 1024; // ← cambiar este número (en MB)
```

Regla: `CHUNK_SIZE` debe subir en menos de 90 segundos. Con 80 MB funciona bien para conexiones de ~10+ Mbps. Si hay timeouts, bajar a 30-50 MB.

## Rutas del servidor Express

| Método | Ruta | Descripción |
|---|---|---|
| `GET /` | — | Sirve `public/index.html` |
| `GET /health` | — | Healthcheck |
| `PUT /upload` | `?folder=X&filename=Y` | Subida directa ≤ 80 MB |
| `POST /start-upload` | `?folder=X&filename=Y` | Inicia sesión chunked |
| `PUT /upload-chunk` | `?uploadId=X&offset=Y` | Sube una parte |
| `POST /finish-upload` | body `{uploadId, storageKey, totalSize}` | Ensambla en Nextcloud |

Todas las rutas requieren header: `Authorization: Bearer academia2024`

## Despliegue en Render

1. Push a GitHub (`git push`)
2. En dashboard.render.com → servicio `academia-jrubio` → **Manual Deploy**
3. Esperar ~1 minuto

Si Render "duerme" el servidor (free tier, 15 min sin uso), la primera petición tarda ~50s en despertar. Es normal.

## Cómo agregar una nueva carpeta/marca

En `apps/upload-portal/public/index.html` y `apps/web/app/admin/archivos/file-upload-input.tsx`, agregar el botón en la sección de `quick-folders`:

```html
<button class="qf-btn" onclick="setFolder('NuevaMarca')">NuevaMarca</button>
```

## Errores comunes

| Error | Causa | Solución |
|---|---|---|
| "Token incorrecto" | UPLOAD_TOKEN no coincide | Verificar env var en Render |
| "Nextcloud no configurado" | Vars de NC no están en Render | Agregar en Render → Environment |
| Upload pegado en 0% | Timeout de Render (parte muy grande) | Bajar CHUNK_SIZE a 30-50 MB |
| "Not Found" en la URL | Render aún no terminó de despertar | Esperar 50s y refrescar |
| Error en parte X | Problema de red temporal | Refrescar y subir de nuevo |
