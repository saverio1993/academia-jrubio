'use client';

import { useState, useTransition } from 'react';
import { marked } from 'marked';
import { createPost } from '../actions';
import { CATEGORIES } from '../categories';

const catKeys = Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[];

export function CreatePostForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [content, setContent] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
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

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
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
