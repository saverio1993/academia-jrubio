'use client';

import { useState, useTransition, useRef } from 'react';
import { marked } from 'marked';
import { createPost } from '../actions';
import { CATEGORIES } from '../categories';

const catKeys = Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[];

interface Attachment {
  storageKey: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  localUrl?: string; // local preview for images
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CreatePostForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    const results: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`"${file.name}" supera el límite de 10 MB`);
        continue;
      }

      try {
        const res = await fetch(
          `/api/comunidad/upload?filename=${encodeURIComponent(file.name)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'Content-Length': String(file.size),
            },
            body: file,
          },
        );

        if (!res.ok) {
          const { error } = await res.json() as { error: string };
          setUploadError(error ?? 'Error subiendo el archivo');
          continue;
        }

        const data = await res.json() as Attachment;
        const localUrl = isImage(file.type) ? URL.createObjectURL(file) : undefined;
        results.push({ ...data, localUrl });
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Error de red');
      }
    }

    setAttachments((prev) => [...prev, ...results]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeAttachment(storageKey: string) {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.storageKey === storageKey);
      if (removed?.localUrl) URL.revokeObjectURL(removed.localUrl);
      return prev.filter((a) => a.storageKey !== storageKey);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('attachments', JSON.stringify(attachments.map(({ localUrl: _, ...rest }) => rest)));
    startTransition(async () => {
      try {
        await createPost(fd);
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
          setError(err.message);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-sm font-medium"
          style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      {/* Título */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
          Título *
        </label>
        <input
          name="title"
          required
          minLength={5}
          maxLength={120}
          placeholder="Ej: Cómo hacer FRP Samsung A55 con Odin..."
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-medium placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
          Categoría *
        </label>
        <select
          name="category"
          required
          defaultValue="general"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[var(--color-accent)]"
        >
          {catKeys.map((k) => {
            const c = CATEGORIES[k];
            return (
              <option key={k} value={k}>
                {c.emoji} {c.label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Contenido */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
            Contenido * <span className="text-[10px] normal-case font-normal">(Markdown)</span>
          </label>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="text-xs font-semibold px-2 py-0.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            {preview ? '✏️ Editar' : '👁 Vista previa'}
          </button>
        </div>

        {preview ? (
          <div
            className="post-content min-h-[280px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm"
            dangerouslySetInnerHTML={{
              __html: content
                ? (marked.parse(content) as string)
                : '<p style="color:var(--color-muted)">Sin contenido aún…</p>',
            }}
          />
        ) : (
          <textarea
            name="content"
            required
            minLength={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            placeholder={`# Método paso a paso\n\n## Requisitos\n- Odin 3.14\n- Cable USB\n\n## Pasos\n1. Descargar el archivo...\n2. Abrir Odin...\n\n> Nota: funciona en A55 con One UI 6.`}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-mono resize-y leading-relaxed placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        )}
        <p className="text-[11px] text-[var(--color-muted)] mt-1.5">
          Acepta Markdown: **negrita**, *cursiva*, `código`, ## Encabezado, listas, &gt;citas
        </p>
      </div>

      {/* Adjuntos */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
          Adjuntos <span className="text-[10px] normal-case font-normal">(imágenes, PDF, ZIP · máx. 10 MB c/u)</span>
        </label>

        {/* Zona de drop / click */}
        <div
          className="relative rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <div className="px-4 py-5 text-center">
            {uploading ? (
              <p className="text-sm text-[var(--color-muted)]">⏳ Subiendo a Nextcloud…</p>
            ) : (
              <>
                <p className="text-2xl mb-1">📎</p>
                <p className="text-sm font-semibold">Arrastra archivos aquí o haz clic</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">Imágenes, PDF, ZIP</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.zip"
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {uploadError && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: '#ef4444' }}>
            {uploadError}
          </p>
        )}

        {/* Preview de adjuntos */}
        {attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {/* Imágenes en grid */}
            {attachments.filter((a) => isImage(a.mimeType)).length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {attachments.filter((a) => isImage(a.mimeType)).map((a) => (
                  <div key={a.storageKey} className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.localUrl ?? a.publicUrl}
                      alt={a.fileName}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.storageKey)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                      <p className="text-[10px] text-white truncate">{fmtSize(a.sizeBytes)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Otros archivos */}
            {attachments.filter((a) => !isImage(a.mimeType)).map((a) => (
              <div
                key={a.storageKey}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5"
              >
                <span className="text-xl shrink-0">
                  {a.mimeType === 'application/pdf' ? '📄' : '🗜️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.fileName}</p>
                  <p className="text-[11px] text-[var(--color-muted)]">{fmtSize(a.sizeBytes)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.storageKey)}
                  className="text-xs text-[var(--color-muted)] hover:text-red-400 transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending || uploading}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-60 transition-opacity"
          style={{ background: 'var(--color-accent)' }}
        >
          {pending ? '⏳ Publicando…' : '🚀 Publicar'}
        </button>
        <a
          href="/comunidad"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
