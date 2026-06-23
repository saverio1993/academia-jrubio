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

export function FileUploadInput({ onUploaded }: Props) {
  const [folder, setFolder] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedKey, setUploadedKey] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus('idle');
    setProgress(0);
    setUploadedKey('');
  }

  function handleUpload() {
    if (!file) { setErrorMsg('Selecciona un archivo primero'); return; }
    if (!folder.trim()) { setErrorMsg('Escribe la carpeta destino'); return; }

    setErrorMsg('');
    setStatus('uploading');
    setProgress(0);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder.trim());

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        setStatus('done');
        setProgress(100);
        setUploadedKey(data.storageKey);
        onUploaded(data.storageKey, data.sizeBytes, data.mimeType);
      } else {
        const data = JSON.parse(xhr.responseText);
        setStatus('error');
        setErrorMsg(data.error ?? 'Error al subir el archivo');
      }
    };

    xhr.onerror = () => {
      setStatus('error');
      setErrorMsg('Error de conexión al subir el archivo');
    };

    xhr.open('POST', '/api/admin/upload-file');
    xhr.send(fd);
  }

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
          disabled={status === 'uploading'}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
        />
        <datalist id="folderSuggestions">
          {FOLDER_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Ej: <code>Samsung/A55/Firmware</code> — se crea la carpeta si no existe
        </p>
      </div>

      {/* Selector de archivo */}
      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">Archivo *</label>
        <input
          ref={fileRef}
          type="file"
          onChange={handleFileChange}
          disabled={status === 'uploading'}
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
          disabled={status === 'uploading' || !file}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'uploading' ? 'Subiendo…' : '⬆ Subir archivo'}
        </button>
      )}

      {/* Barra de progreso */}
      {status === 'uploading' && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              className="h-2 rounded-full bg-[var(--color-accent)] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--color-muted)]">Subiendo… {progress}%</p>
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
