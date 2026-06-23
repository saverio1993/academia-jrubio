'use client';

import { useState, useRef } from 'react';

const FOLDER_SUGGESTIONS = [
  'Samsung/Firmware',
  'Samsung/FRP',
  'Samsung/Drivers',
  'Xiaomi/Firmware',
  'Xiaomi/FRP',
  'Motorola/Firmware',
  'Huawei/Firmware',
  'Oppo/Firmware',
  'Herramientas',
  'Drivers',
  'Tutoriales',
];

interface Props {
  onUploaded: (storageKey: string, sizeBytes: number, mimeType: string | null) => void;
}

type Status = 'idle' | 'preparing' | 'uploading' | 'done' | 'error';

export function FileUploadInput({ onUploaded }: Props) {
  const [folder, setFolder] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [statusLabel, setStatusLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedKey, setUploadedKey] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus('idle');
    setProgress(0);
    setUploadedKey('');
    setErrorMsg('');
    setStatusLabel('');
  }

  async function handleUpload() {
    if (!file)           { setErrorMsg('Selecciona un archivo primero'); return; }
    if (!folder.trim()) { setErrorMsg('Escribe la carpeta destino'); return; }

    setErrorMsg('');
    setStatus('preparing');
    setStatusLabel('Preparando carpeta en Nextcloud…');
    setProgress(0);

    // ── Paso 1: pedir credenciales de subida directa al servidor ─────────
    // El servidor crea la carpeta en Nextcloud y devuelve la URL WebDAV.
    const params = new URLSearchParams({ folder: folder.trim(), filename: file.name });
    let webdavUrl = '';
    let authHeader = '';
    let storageKey = '';

    try {
      const res = await fetch(`/api/admin/upload-creds?${params}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      const data = await res.json();
      webdavUrl  = data.webdavUrl;
      authHeader = data.authHeader;
      storageKey = data.storageKey;
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(`No se pudo preparar la subida: ${err instanceof Error ? err.message : err}`);
      return;
    }

    // ── Paso 2: intentar subida DIRECTA a Nextcloud (sin pasar por Vercel) ──
    setStatus('uploading');
    setStatusLabel('Subiendo directo a cloud.heyvalue.com…');

    const directOk = await attemptDirectUpload(
      webdavUrl, authHeader, file,
      (pct) => setProgress(pct),
    );

    if (directOk) {
      setStatus('done');
      setProgress(100);
      setUploadedKey(storageKey);
      onUploaded(storageKey, file.size, file.type || null);
      return;
    }

    // ── Paso 3: CORS no habilitado en HeyValue → fallback via streaming ──
    // El archivo pasa por nuestro servidor, que lo reenvía a Nextcloud.
    // Esto funciona siempre; la velocidad depende del límite de Vercel.
    setStatusLabel('Subiendo vía servidor (esperando CORS de HeyValue)…');
    setProgress(0);

    const fallbackParams = new URLSearchParams({ folder: folder.trim(), filename: file.name });
    const fallbackOk = await attemptStreamUpload(
      `/api/admin/upload-file?${fallbackParams}`,
      file,
      (pct) => setProgress(pct),
    );

    if (fallbackOk.ok) {
      setStatus('done');
      setProgress(100);
      setUploadedKey(fallbackOk.storageKey ?? storageKey);
      onUploaded(fallbackOk.storageKey ?? storageKey, fallbackOk.sizeBytes ?? file.size, file.type || null);
    } else {
      setStatus('error');
      setErrorMsg(fallbackOk.error ?? 'Error desconocido al subir el archivo');
    }
  }

  const busy = status === 'preparing' || status === 'uploading';

  return (
    <div className="space-y-3">
      {/* Carpeta destino */}
      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          Carpeta destino en Nextcloud *
        </label>
        <input
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="Samsung/A55/Firmware"
          list="folderSuggestions"
          disabled={busy}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
        />
        <datalist id="folderSuggestions">
          {FOLDER_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Ej: <code>Samsung/A55/Firmware</code> — se crea automáticamente si no existe
        </p>
      </div>

      {/* Selector de archivo */}
      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">Archivo *</label>
        <input
          ref={fileRef}
          type="file"
          onChange={handleFileChange}
          disabled={busy}
          className="block w-full text-sm text-[var(--color-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-card)] file:border file:border-[var(--color-border)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-fg)] hover:file:bg-white/10 file:cursor-pointer disabled:opacity-50"
        />
        {file && (
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>

      {/* Botón subir */}
      {status !== 'done' && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy || !file}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Subiendo…' : '⬆ Subir archivo'}
        </button>
      )}

      {/* Progreso */}
      {(busy) && (
        <div className="space-y-1">
          {status === 'uploading' && (
            <div className="h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
              <div
                className="h-2 rounded-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <p className="text-xs text-[var(--color-muted)] animate-pulse">
            {statusLabel} {status === 'uploading' && progress > 0 ? `${progress}%` : ''}
          </p>
        </div>
      )}

      {/* Éxito */}
      {status === 'done' && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          ✓ Archivo subido correctamente
          <p className="mt-1 font-mono text-xs text-green-300/70 break-all">{uploadedKey}</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          ✗ {errorMsg}
        </div>
      )}
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Intenta PUT directo a Nextcloud WebDAV. Devuelve true si funciona (CORS OK). */
function attemptDirectUpload(
  url: string,
  authHeader: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      // WebDAV PUT: 201 = creado, 204 = reemplazado
      resolve(xhr.status === 200 || xhr.status === 201 || xhr.status === 204);
    };

    // onerror == CORS bloqueado u otro error de red
    xhr.onerror = () => resolve(false);

    xhr.open('PUT', url);
    xhr.setRequestHeader('Authorization', authHeader);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

/** Sube via nuestro servidor (streaming). Devuelve {ok, storageKey, sizeBytes, error}. */
function attemptStreamUpload(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ ok: boolean; storageKey?: string; sizeBytes?: number; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ ok: true, storageKey: data.storageKey, sizeBytes: data.sizeBytes });
      } else {
        let error = 'Error al subir el archivo';
        try { error = JSON.parse(xhr.responseText).error ?? error; } catch { /* noop */ }
        resolve({ ok: false, error });
      }
    };

    xhr.onerror = () => resolve({ ok: false, error: 'Error de conexión con el servidor' });

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-file-type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}
