/**
 * Portal de subida directa a Nextcloud — Academia J Rubio
 *
 * Variables de entorno requeridas:
 *   NEXTCLOUD_URL          = https://cloud.heyvalue.com
 *   NEXTCLOUD_USER         = 8202944a-6bb4-49f3-9e06-a4a5849813f2
 *   NEXTCLOUD_APP_PASSWORD = TH6Te-d7pXo-8yTKw-xDk4f-co98P
 *   NEXTCLOUD_BASE_PATH    = AcademiaJRubio/files
 *   UPLOAD_TOKEN           = (clave secreta para proteger el portal)
 *   PORT                   = 3001  (opcional, Render lo pone automático)
 */

const express = require('express');
const path    = require('path');
const { Readable } = require('stream');

const app = express();

// ── Configuración ───────────────────────────────────────────────────────────
const NC_URL   = () => (process.env.NEXTCLOUD_URL   ?? '').replace(/\/$/, '');
const NC_USER  = () =>  process.env.NEXTCLOUD_USER  ?? '';
const NC_PASS  = () =>  process.env.NEXTCLOUD_APP_PASSWORD ?? '';
const NC_BASE  = () => (process.env.NEXTCLOUD_BASE_PATH ?? 'AcademiaJRubio/files').replace(/^\/|\/$/g, '');
const TOKEN    = ()  =>  process.env.UPLOAD_TOKEN   ?? 'academia2024';
const PORT     =       process.env.PORT              ?? 3001;

const authHeader = () => 'Basic ' + Buffer.from(`${NC_USER()}:${NC_PASS()}`).toString('base64');
const davBase    = () => `${NC_URL()}/remote.php/dav/files/${NC_USER()}`;

// ── Archivos estáticos ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── CORS ────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Content-Length, X-File-Name, X-Folder');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
});

// ── Crear carpeta en Nextcloud (MKCOL recursivo) ────────────────────────────
async function mkdirRecursive(dirPath) {
  const parts = dirPath.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += '/' + part;
    try {
      await fetch(`${davBase()}${current}`, {
        method: 'MKCOL',
        headers: { Authorization: authHeader() },
      });
      // 201 = creada, 405 = ya existe — ambas OK
    } catch { /* continúa */ }
  }
}

// ── PUT /upload?folder=X&filename=Y ─────────────────────────────────────────
// El cliente envía el archivo como body binario puro.
// El servidor lo transmite directamente a Nextcloud sin bufferear en RAM.
app.put('/upload', async (req, res) => {
  // Verificar token
  const bearer = (req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
  if (bearer !== TOKEN()) {
    return res.status(401).json({ error: 'Token incorrecto' });
  }

  if (!NC_URL() || !NC_USER() || !NC_PASS()) {
    return res.status(500).json({ error: 'Nextcloud no configurado en el servidor' });
  }

  const folder   = (req.query.folder   ?? req.headers['x-folder']   ?? '').toString().trim().replace(/^\/|\/$/g, '');
  const rawName  = (req.query.filename ?? req.headers['x-file-name'] ?? 'upload').toString().trim();
  const filename = rawName.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
  const mimeType = req.headers['content-type'] ?? 'application/octet-stream';
  const size     = req.headers['content-length'];

  const storageKey = folder ? `${folder}/${filename}` : filename;
  const fullPath   = `${NC_BASE()}/${storageKey}`;
  const dirPath    = fullPath.substring(0, fullPath.lastIndexOf('/'));

  try {
    // 1. Crear directorio destino
    await mkdirRecursive(dirPath);

    // 2. Stream directo → Nextcloud
    const ncRes = await fetch(`${davBase()}/${fullPath}`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader(),
        'Content-Type': mimeType,
        ...(size ? { 'Content-Length': size } : {}),
      },
      body: Readable.toWeb(req),
      duplex: 'half',
    });

    if (!ncRes.ok) {
      const text = await ncRes.text().catch(() => '');
      return res.status(500).json({ error: `Nextcloud ${ncRes.status}: ${text}` });
    }

    res.json({ ok: true, storageKey });
  } catch (err) {
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

// ── Healthcheck ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Portal de archivos escuchando en http://localhost:${PORT}`);
});
