'use client';

import { useState } from 'react';

const FOLDER_SUGGESTIONS = [
  'Samsung/Firmware', 'Samsung/FRP', 'Samsung/Drivers',
  'Xiaomi/Firmware', 'Xiaomi/FRP',
  'Motorola/Firmware', 'Huawei/Firmware', 'Oppo/Firmware',
  'Herramientas', 'Drivers', 'Tutoriales',
];

// URL del Cloudflare Worker — se configura en Vercel como variable de entorno
const WORKER_URL = process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL ?? '';
// Token secreto que el worker verifica (igual en Vercel y en el Worker)
const WORKER_TOKEN = process.env.NEXT_PUBLIC_UPLOAD_WORKER_TOKEN ?? '';

interface Props {
  onUploaded: (storageKey: string, sizeBytes: number, mimeType: string | null) => void;
}

export function FileUploadInput({ onUploaded }: Props) {
  const [folder,   setFolder]   = useState('');
  const [file,     setFile]     = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [label,    setLabel]    = useState('');
  const [status,   setStatus]   = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [doneKey,  setDoneKey]  = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus('idle');
    setProgress(0);
    setErrorMsg('');
    setDoneKey('');
  }

  async function handleUpload() {
    if (!file)          { setErrorMsg('Selecciona un archivo primero'); return; }
    if (!folder.trim()) { setErrorMsg('Escribe la carpeta destino');    return; }

    setStatus('busy');
    setErrorMsg('');
    setProgress(0);

    try {
      if (WORKER_URL) {
        await uploadViaWorker(file, folder.trim(), onUploadProgress);
      } else {
        await uploadViaServer(file, folder.trim(), onUploadProgress);
      }
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir el archivo');
    }

    function onUploadProgress(pct: number, lbl: string, key?: string) {
      setProgress(pct);
      setLabel(lbl);
      if (key) {
        setStatus('done');
        setDoneKey(key);
        onUploaded(key, file!.size, file!.type || null);
      }
    }
  }

  // ── Upload via Cloudflare Worker (directo a Nextcloud, sin límite) ──────
  async function uploadViaWorker(
    file: File,
    folder: string,
    onProgress: (pct: number, lbl: string, key?: string) => void,
  ) {
    onProgress(0, 'Conectando con Nextcloud…');

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(
            Math.round((e.loaded / e.total) * 100),
            `Subiendo directo a Nextcloud… ${Math.round((e.loaded / e.total) * 100)}%`,
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          onProgress(100, 'Archivo guardado en Nextcloud', data.storageKey);
          resolve();
        } else {
          let msg = `Error ${xhr.status}`;
          try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch { /* noop */ }
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => reject(new Error('Error de conexión con el servidor de subida'));

      const filename = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
      xhr.open('PUT', WORKER_URL);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-folder',      folder);
      xhr.setRequestHeader('x-filename',    filename);
      xhr.setRequestHeader('x-admin-token', WORKER_TOKEN);
      xhr.send(file);
    });
  }

  // ── Fallback: upload via servidor Next.js (mientras Worker no esté listo) ─
  async function uploadViaServer(
    file: File,
    folder: string,
    onProgress: (pct: number, lbl: string, key?: string) => void,
  ) {
    onProgress(0, 'Preparando carpeta…');

    const params = new URLSearchParams({ folder, filename: file.name });
    const credsRes = await fetch(`/api/admin/upload-creds?${params}`);
    if (!credsRes.ok) {
      const d = await credsRes.json().catch(() => ({}));
      throw new Error(d.error ?? `HTTP ${credsRes.status}`);
    }
    const { storageKey } = await credsRes.json();

    onProgress(10, 'Subiendo archivo…');

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = 10 + Math.round((e.loaded / e.total) * 88);
          onProgress(pct, `Subiendo… ${pct}%`);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          onProgress(100, 'Listo', storageKey);
          resolve();
        } else {
          let msg = 'Error al subir el archivo';
          try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch { /* noop */ }
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => reject(new Error('Error de conexión'));

      const chunkParams = new URLSearchParams({ folder, filename: file.name });
      xhr.open('PUT', `/api/admin/upload-file?${chunkParams}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-file-type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }

  return (
    <div className="space-y-3">
      {!WORKER_URL && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
          ⚠ Cloudflare Worker no configurado — usando servidor como intermediario.
          Archivos grandes ({'>'}4 MB) pueden fallar en producción.
        </div>
      )}

      {/* Carpeta */}
      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          Carpeta destino en Nextcloud *
        </label>
        <input
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="Samsung/A55/Firmware"
          list="folderSuggestions"
          disabled={status === 'busy'}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
        />
        <datalist id="folderSuggestions">
          {FOLDER_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>

      {/* Archivo */}
      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">Archivo *</label>
        <input
          type="file"
          onChange={handleFileChange}
          disabled={status === 'busy'}
          className="block w-full text-sm text-[var(--color-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-card)] file:border file:border-[var(--color-border)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-fg)] hover:file:bg-white/10 file:cursor-pointer disabled:opacity-50"
        />
        {file && (
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>

      {/* Botón */}
      {status !== 'done' && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={status === 'busy' || !file}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'busy' ? 'Subiendo…' : '⬆ Subir archivo'}
        </button>
      )}

      {/* Progreso */}
      {status === 'busy' && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              className="h-2 rounded-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
        </div>
      )}

      {/* Éxito */}
      {status === 'done' && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          ✓ Archivo guardado en Nextcloud
          <p className="mt-1 font-mono text-xs text-green-300/70 break-all">{doneKey}</p>
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
