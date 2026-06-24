'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';

const RENDER_URL   = (process.env.NEXT_PUBLIC_RENDER_UPLOAD_URL   ?? '').replace(/\/$/, '');
const RENDER_TOKEN = process.env.NEXT_PUBLIC_RENDER_UPLOAD_TOKEN  ?? 'academia2024';
const CHUNK_SIZE   = 80 * 1024 * 1024; // 80 MB por parte

export interface UploadResult {
  storageKey: string;
  size: number;
  mime: string | null;
}

export interface FileUploadHandle {
  upload: (folder: string) => Promise<UploadResult>;
  hasFile: () => boolean;
}

interface Props {
  onFileSelected?: (file: File | null) => void;
  onUploaded?: (result: UploadResult) => void;
}

export const FileUploadInput = forwardRef<FileUploadHandle, Props>(
  function FileUploadInput({ onFileSelected, onUploaded }, ref) {
    const [file,       setFile]       = useState<File | null>(null);
    const [progress,   setProgress]   = useState(0);
    const [label,      setLabel]      = useState('');
    const [chunkLabel, setChunkLabel] = useState('');
    const [uploading,  setUploading]  = useState(false);
    const [doneKey,    setDoneKey]    = useState('');

    useImperativeHandle(ref, () => ({
      hasFile: () => file !== null,
      upload: async (folder: string): Promise<UploadResult> => {
        if (!file)     throw new Error('Selecciona un archivo primero');
        if (!RENDER_URL) throw new Error('NEXT_PUBLIC_RENDER_UPLOAD_URL no está configurado en Vercel');

        setUploading(true);
        setDoneKey('');
        setProgress(0);
        setLabel('Iniciando subida…');
        setChunkLabel('');

        try {
          const storageKey = file.size <= CHUNK_SIZE
            ? await uploadDirect(file, folder)
            : await uploadChunked(file, folder);

          setProgress(100);
          setLabel('Guardado en Nextcloud');
          setChunkLabel('');
          setDoneKey(storageKey);

          const result: UploadResult = { storageKey, size: file.size, mime: file.type || null };
          onUploaded?.(result);
          return result;
        } finally {
          setUploading(false);
        }
      },
    }), [file]);

    function pickFile(f: File | null) {
      setFile(f);
      setDoneKey('');
      setProgress(0);
      setLabel('');
      onFileSelected?.(f);
    }

    // ── Subida directa ≤ 80 MB ────────────────────────────────────────────
    function uploadDirect(f: File, folder: string): Promise<string> {
      const filename = f.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
      const params   = new URLSearchParams({ folder, filename });
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round(e.loaded / e.total * 100);
            setProgress(pct);
            setLabel(`Subiendo… ${pct}% — ${fmt(e.loaded)} de ${fmt(e.total)}`);
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve((JSON.parse(xhr.responseText) as { storageKey: string }).storageKey);
          } else {
            let m = `Error ${xhr.status}`;
            try { m = (JSON.parse(xhr.responseText) as { error?: string }).error ?? m; } catch { /**/ }
            reject(new Error(m));
          }
        };
        xhr.onerror = () => reject(new Error('Error de red'));
        xhr.open('PUT', `${RENDER_URL}/upload?${params}`);
        xhr.setRequestHeader('Authorization', `Bearer ${RENDER_TOKEN}`);
        xhr.setRequestHeader('Content-Type', f.type || 'application/octet-stream');
        xhr.send(f);
      });
    }

    // ── Subida por partes > 80 MB ─────────────────────────────────────────
    async function uploadChunked(f: File, folder: string): Promise<string> {
      const filename    = f.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
      const totalChunks = Math.ceil(f.size / CHUNK_SIZE);
      const params      = new URLSearchParams({ folder, filename });

      setLabel('Creando sesión en Nextcloud…');
      const startRes = await fetch(`${RENDER_URL}/start-upload?${params}`, {
        method: 'POST', headers: { Authorization: `Bearer ${RENDER_TOKEN}` },
      });
      if (!startRes.ok) {
        const d = await startRes.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `Error ${startRes.status}`);
      }
      const { uploadId, storageKey } = await startRes.json() as { uploadId: string; storageKey: string };

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const chunk = f.slice(start, Math.min(start + CHUNK_SIZE, f.size));
        const p     = new URLSearchParams({ uploadId, offset: String(start) });
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const done = start + e.loaded;
              const pct  = Math.round(done / f.size * 100);
              setProgress(pct);
              setLabel(`Subiendo… ${pct}% — ${fmt(done)} de ${fmt(f.size)}`);
              setChunkLabel(`Parte ${i + 1} de ${totalChunks}`);
            }
          };
          xhr.onload = () => {
            if (xhr.status === 200) resolve();
            else {
              let m = `Error parte ${i + 1}: ${xhr.status}`;
              try { m = (JSON.parse(xhr.responseText) as { error?: string }).error ?? m; } catch { /**/ }
              reject(new Error(m));
            }
          };
          xhr.onerror = () => reject(new Error(`Error de red en parte ${i + 1}`));
          xhr.open('PUT', `${RENDER_URL}/upload-chunk?${p}`);
          xhr.setRequestHeader('Authorization', `Bearer ${RENDER_TOKEN}`);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          xhr.send(chunk);
        });
      }

      setProgress(99);
      setLabel('Ensamblando en Nextcloud…');
      setChunkLabel(`${totalChunks} partes recibidas`);
      const finRes = await fetch(`${RENDER_URL}/finish-upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${RENDER_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, storageKey, totalSize: f.size }),
      });
      if (!finRes.ok) {
        const d = await finRes.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `Error ${finRes.status}`);
      }
      return storageKey;
    }

    return (
      <div className="space-y-2">
        <input
          type="file"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          disabled={uploading}
          className="block w-full text-sm text-[var(--color-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-card)] file:border file:border-[var(--color-border)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-fg)] hover:file:bg-white/10 file:cursor-pointer disabled:opacity-50"
        />
        {file && (
          <p className="text-xs text-[var(--color-muted)]">
            {file.name} — {fmt(file.size)}
            {file.size > CHUNK_SIZE && (
              <span className="ml-2 text-[var(--color-accent)]">
                · {Math.ceil(file.size / CHUNK_SIZE)} partes de 80 MB
              </span>
            )}
          </p>
        )}

        {/* Barra de progreso */}
        {(uploading || (progress > 0 && progress < 100)) && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
              <div
                className="h-2 rounded-full bg-[var(--color-accent)] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[var(--color-muted)]">{label}</p>
            {chunkLabel && <p className="text-xs text-[var(--color-muted)] opacity-60">{chunkLabel}</p>}
          </div>
        )}

        {/* Éxito */}
        {doneKey && !uploading && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            ✓ Guardado en Nextcloud
            <p className="mt-0.5 font-mono text-xs text-green-300/70 break-all">{doneKey}</p>
          </div>
        )}
      </div>
    );
  },
);

function fmt(bytes: number): string {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1_048_576)     return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}
