/**
 * Portal de subida directa a Nextcloud — Academia J Rubio
 *
 * Variables de entorno requeridas:
 *   NEXTCLOUD_URL          = https://cloud.heyvalue.com
 *   NEXTCLOUD_USER         = 8202944a-6bb4-49f3-9e06-a4a5849813f2
 *   NEXTCLOUD_APP_PASSWORD = TH6Te-d7pXo-8yTKw-xDk4f-co98P
 *   NEXTCLOUD_BASE_PATH    = AcademiaJRubio/files
 *   UPLOAD_TOKEN           = (clave secreta para proteger el portal)
 */

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const { Readable } = require('stream');

const app = express();
app.use(express.json());

// ── Configuración ───────────────────────────────────────────────────────────
const NC_URL   = () => (process.env.NEXTCLOUD_URL   ?? '').replace(/\/$/, '');
const NC_USER  = () =>  process.env.NEXTCLOUD_USER  ?? '';
const NC_PASS  = () =>  process.env.NEXTCLOUD_APP_PASSWORD ?? '';
const NC_BASE  = () => (process.env.NEXTCLOUD_BASE_PATH ?? 'AcademiaJRubio/files').replace(/^\/|\/$/g, '');
const TOKEN    = ()  =>  process.env.UPLOAD_TOKEN   ?? 'academia2024';
const PORT     =       process.env.PORT              ?? 3001;

const authHeader  = () => 'Basic ' + Buffer.from(`${NC_USER()}:${NC_PASS()}`).toString('base64');
const davFiles    = () => `${NC_URL()}/remote.php/dav/files/${NC_USER()}`;
const davUploads  = () => `${NC_URL()}/remote.php/dav/uploads/${NC_USER()}`;

// ── Archivos estáticos ──────────────────────────────────────────────────────
const INDEX_FILE = path.join(__dirname, 'public', 'index.html');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_req, res) => res.sendFile(INDEX_FILE));

// ── CORS ────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Content-Length');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
});

// ── Auth helper ─────────────────────────────────────────────────────────────
function checkToken(req, res) {
  const bearer = (req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
  if (bearer !== TOKEN()) { res.status(401).json({ error: 'Token incorrecto' }); return false; }
  if (!NC_URL() || !NC_USER() || !NC_PASS()) {
    res.status(500).json({ error: 'Nextcloud no configurado en el servidor' }); return false;
  }
  return true;
}

// ── MKCOL recursivo ─────────────────────────────────────────────────────────
async function mkdirRecursive(dirPath) {
  const parts = dirPath.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += '/' + part;
    try {
      await fetch(`${davFiles()}${current}`, {
        method: 'MKCOL',
        headers: { Authorization: authHeader() },
      });
    } catch { /* 405 ya existe = OK */ }
  }
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
}

// ── PUT /upload  (archivos pequeños, directo) ────────────────────────────────
app.put('/upload', async (req, res) => {
  if (!checkToken(req, res)) return;

  const folder   = (req.query.folder   ?? '').toString().trim().replace(/^\/|\/$/g, '');
  const filename = sanitize((req.query.filename ?? 'upload').toString().trim());
  const mimeType = req.headers['content-type'] ?? 'application/octet-stream';
  const size     = req.headers['content-length'];

  const storageKey = folder ? `${folder}/${filename}` : filename;
  const fullPath   = `${NC_BASE()}/${storageKey}`;

  try {
    await mkdirRecursive(fullPath.substring(0, fullPath.lastIndexOf('/')));

    const ncRes = await fetch(`${davFiles()}/${fullPath}`, {
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

// ── POST /start-upload  (inicia sesión de subida por partes) ─────────────────
app.post('/start-upload', async (req, res) => {
  if (!checkToken(req, res)) return;

  const folder   = (req.query.folder   ?? '').toString().trim().replace(/^\/|\/$/g, '');
  const filename = sanitize((req.query.filename ?? 'upload').toString().trim());

  const storageKey = folder ? `${folder}/${filename}` : filename;
  const fullPath   = `${NC_BASE()}/${storageKey}`;

  try {
    await mkdirRecursive(fullPath.substring(0, fullPath.lastIndexOf('/')));

    const uploadId = crypto.randomUUID();
    const mkcolRes = await fetch(`${davUploads()}/${uploadId}`, {
      method: 'MKCOL',
      headers: { Authorization: authHeader() },
    });

    if (!mkcolRes.ok && mkcolRes.status !== 405) {
      return res.status(500).json({ error: `No se pudo crear sesión: ${mkcolRes.status}` });
    }

    res.json({ uploadId, storageKey });
  } catch (err) {
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

// ── PUT /upload-chunk  (sube una parte) ─────────────────────────────────────
app.put('/upload-chunk', async (req, res) => {
  if (!checkToken(req, res)) return;

  const uploadId = (req.query.uploadId ?? '').toString();
  const offset   = parseInt(req.query.offset ?? '0', 10);
  const size     = req.headers['content-length'];

  if (!uploadId) return res.status(400).json({ error: 'uploadId requerido' });

  try {
    const chunkRes = await fetch(`${davUploads()}/${uploadId}/${offset}`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/octet-stream',
        ...(size ? { 'Content-Length': size } : {}),
      },
      body: Readable.toWeb(req),
      duplex: 'half',
    });

    if (!chunkRes.ok) {
      const text = await chunkRes.text().catch(() => '');
      return res.status(500).json({ error: `Parte ${chunkRes.status}: ${text}` });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message ?? err) });
  }
});

// ── POST /finish-upload  (ensambla el archivo en Nextcloud) ──────────────────
app.post('/finish-upload', async (req, res) => {
  if (!checkToken(req, res)) return;

  const { uploadId, storageKey, totalSize } = req.body ?? {};
  if (!uploadId || !storageKey) return res.status(400).json({ error: 'Parámetros incompletos' });

  const destUrl = `${davFiles()}/${NC_BASE()}/${storageKey}`;

  try {
    const moveRes = await fetch(`${davUploads()}/${uploadId}/.file`, {
      method: 'MOVE',
      headers: {
        Authorization: authHeader(),
        Destination: destUrl,
        'OC-Total-Length': String(totalSize ?? 0),
        Overwrite: 'T',
      },
    });

    if (!moveRes.ok) {
      const text = await moveRes.text().catch(() => '');
      return res.status(500).json({ error: `Ensamblado ${moveRes.status}: ${text}` });
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
