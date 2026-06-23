/**
 * Cloudflare Worker — Proxy de subida directa a Nextcloud
 *
 * Variables de entorno (configurar en el Dashboard de Cloudflare):
 *   NEXTCLOUD_URL          = https://cloud.heyvalue.com
 *   NEXTCLOUD_USER         = 8202944a-6bb4-49f3-9e06-a4a5849813f2
 *   NEXTCLOUD_APP_PASSWORD = TH6Te-d7pXo-8yTKw-xDk4f-co98P
 *   NEXTCLOUD_BASE_PATH    = AcademiaJRubio/files
 *   ALLOWED_ORIGIN         = https://academia-jrubio.vercel.app
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '*';
    const allowed = env.ALLOWED_ORIGIN ?? '*';

    const cors = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-folder, x-filename, x-admin-token',
      'Access-Control-Max-Age': '86400',
    };

    // ── Preflight CORS ────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'PUT') {
      return new Response('Solo PUT', { status: 405, headers: cors });
    }

    // ── Leer parámetros ───────────────────────────────────────────────────
    const folder   = (request.headers.get('x-folder')   ?? '').trim().replace(/^\/|\/$/g, '');
    const filename = (request.headers.get('x-filename')  ?? 'upload').trim()
      .replace(/[^a-zA-Z0-9._\-() ]/g, '_');
    const mimeType = request.headers.get('content-type') ?? 'application/octet-stream';

    const basePath   = (env.NEXTCLOUD_BASE_PATH ?? 'AcademiaJRubio/files').replace(/^\/|\/$/g, '');
    const storageKey = folder ? `${folder}/${filename}` : filename;
    const fullPath   = `${basePath}/${storageKey}`;

    const ncUrl  = env.NEXTCLOUD_URL.replace(/\/$/, '');
    const ncUser = env.NEXTCLOUD_USER;
    const auth   = 'Basic ' + btoa(`${ncUser}:${env.NEXTCLOUD_APP_PASSWORD}`);
    const davBase = `${ncUrl}/remote.php/dav/files/${ncUser}`;

    // ── Crear carpeta destino (MKCOL recursivo) ───────────────────────────
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
    const parts   = dirPath.split('/').filter(Boolean);
    let current   = '';
    for (const part of parts) {
      current += '/' + part;
      await fetch(`${davBase}${current}`, {
        method: 'MKCOL',
        headers: { Authorization: auth },
      }); // 201 = creada, 405 = ya existe — ambas OK
    }

    // ── Subir archivo directo a Nextcloud ─────────────────────────────────
    const uploadRes = await fetch(`${davBase}/${fullPath}`, {
      method: 'PUT',
      headers: {
        Authorization: auth,
        'Content-Type': mimeType,
      },
      body: request.body,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '');
      return json({ error: `Nextcloud ${uploadRes.status}: ${text}` }, 500, cors);
    }

    return json({ storageKey, ok: true }, 200, cors);
  },
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
