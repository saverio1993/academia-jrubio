'use client';

import { useState } from 'react';

const FOLDER_SUGGESTIONS = [
  'Samsung/Firmware', 'Samsung/FRP', 'Samsung/Drivers',
  'Xiaomi/Firmware', 'Xiaomi/FRP',
  'Motorola/Firmware', 'Huawei/Firmware', 'Oppo/Firmware',
  'Herramientas', 'Drivers', 'Tutoriales',
];

// Servidor Render — sube directo a Nextcloud, sin límite de tamaño
const RENDER_URL   = (process.env.NEXT_PUBLIC_RENDER_UPLOAD_URL   ?? '').replace(/\/$/, '');
const RENDER_TOKEN = process.env.NEXT_PUBLIC_RENDER_UPLOAD_TOKEN  ?? 'academia2024';
const CHUNK_SIZE   = 80 * 1024 * 1024; // 80 MB por parte

interface Props {
  onUploaded: (storageKey: string, sizeBytes: number, mimeType: string | null) => void;
}

export function FileUploadInput({ onUploaded }: Props) {
  const [folder,     setFolder]     = useState('');
  const [file,       setFile]       = useState<File | null>(null);
  const [progress,   setProgress]   = useState(0);
  const [label,      setLabel]      = useState('');
  const [chunkLabel, setChunkLabel] = useState('');
  const [status,     setStatus]     = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [doneKey,    setDoneKey]    = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus('idle');
    setProgress(0);
    setLabel('');
    setChunkLabel('');
    setErrorMsg('');
    setDoneKey('');
  }

  async function handleUpload() {
    if (!file)          { setErrorMsg('Selecciona un archivo primero'); return; }
    if (!folder.trim()) { setErrorMsg('Escribe la carpeta destino');    return; }
    if (!RENDER_URL)    { setErrorMsg('NEXT_PUBLIC_RENDER_UPLOAD_URL no está configurado'); return; }

    setStatus('busy');
    setErrorMsg('');
    setProgress(0);
    setChunkLabel('');

    try {
      let storageKey: string;
      if (file.size <= CHUNK_SIZE) {
        storageKey = await uploadDirect(file, folder.trim());
      } else {
        storageKey = await uploadChunked(file, folder.trim());
      }
      setProgress(100);
      setLabel('Archivo guardado en Nextcloud');
      setChunkLabel('');
      setStatus('done');
      setDoneKey(storageKey);
      onUploaded(storageKey, file.size, file.type || null);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir el archivo');
    }
  }

  // ── Subida directa para archivos ≤ 80 MB ────────────────────────────────
  function uploadDirect(f: File, folder: string): Promise<string> {
    const filename = f.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
    const params   = new URLSearchParams({ folder, filename });

    setLabel('Conectando con Nextcloud…');

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
          setLabel(`Subiendo… ${pct}% — ${fmt(e.loaded)} de ${fmt(e.total)}`);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve((JSON.parse(xhr.responseText) as { storageKey: string }).storageKey);
        } else {
          let msg = `Error ${xhr.status}`;
          try { msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg; } catch { /* noop */ }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Error de red'));

      xhr.open('PUT', `${RENDER_URL}/upload?${params}`);
      xhr.setRequestHeader('Authorization', `Bearer ${RENDER_TOKEN}`);
      xhr.setRequestHeader('Content-Type', f.type || 'application/octet-stream');
      xhr.send(f);
    });
  }

  // ── Subida por partes para archivos > 80 MB ──────────────────────────────
  async function uploadChunked(f: File, folder: string): Promise<string> {
    const filename    = f.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
    const totalChunks = Math.ceil(f.size / CHUNK_SIZE);
    const params      = new URLSearchParams({ folder, filename });

    // 1. Iniciar sesión en Nextcloud
    setLabel('Creando sesión en Nextcloud…');
    setProgress(0);

    const startRes = await fetch(`${RENDER_URL}/start-upload?${params}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RENDER_TOKEN}` },
    });
    if (!startRes.ok) {
      const d = await startRes.json().catch(() => ({})) as { error?: string };
      throw new Error(d.error ?? `Error al iniciar: ${startRes.status}`);
    }
    const { uploadId, storageKey } = await startRes.json() as { uploadId: string; storageKey: string };

    // 2. Subir cada parte
    for (let i = 0; i < totalChunks; i++) {
      const start  = i * CHUNK_SIZE;
      const end    = Math.min(start + CHUNK_SIZE, f.size);
      const chunk  = f.slice(start, end);
      const chunkParams = new URLSearchParams({ uploadId, offset: String(start) });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const bytesDone = start + e.loaded;
            const pct = Math.round((bytesDone / f.size) * 100);
            setProgress(pct);
            setLabel(`Subiendo… ${pct}% — ${fmt(bytesDone)} de ${fmt(f.size)}`);
            setChunkLabel(`Parte ${i + 1} de ${totalChunks}`);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            let msg = `Error en parte ${i + 1}: ${xhr.status}`;
            try { msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg; } catch { /* noop */ }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error(`Error de red en parte ${i + 1}`));

        xhr.open('PUT', `${RENDER_URL}/upload-chunk?${chunkParams}`);
        xhr.setRequestHeader('Authorization', `Bearer ${RENDER_TOKEN}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(chunk);
      });
    }

    // 3. Ensamblar en Nextcloud
    setProgress(99);
    setLabel('Ensamblando en Nextcloud…');
    setChunkLabel(`${totalChunks} partes recibidas`);

    const finishRes = await fetch(`${RENDER_URL}/finish-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RENDER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uploadId, storageKey, totalSize: f.size }),
    });
    if (!finishRes.ok) {
      const d = await finishRes.json().catch(() => ({})) as { error?: string };
      throw new Error(d.error ?? `Error al ensamblar: ${finishRes.status}`);
    }

    return storageKey;
  }

  return (
    <div className="space-y-3">
      {!RENDER_URL && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          ✗ NEXT_PUBLIC_RENDER_UPLOAD_URL no está configurado en Vercel.
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
            {file.name} — {fmt(file.size)}
            {file.size > CHUNK_SIZE && (
              <span className="ml-2 text-[var(--color-accent)]">
                · se subirá en {Math.ceil(file.size / CHUNK_SIZE)} partes de 80 MB
              </span>
            )}
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
              className="h-2 rounded-full bg-[var(--color-accent)] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
          {chunkLabel && (
            <p className="text-xs text-[var(--color-muted)] opacity-60">{chunkLabel}</p>
          )}
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

function fmt(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}
