'use client';

import { useState, useTransition } from 'react';
import { updatePost } from '../../actions';
import { CATEGORIES } from '../../categories';
import { PostEditor } from '../../post-editor';

const catKeys = Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[];

interface Props {
  slug: string;
  post: {
    title: string;
    content: string;
    category: string;
  };
}

export function EditPostForm({ slug, post }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState(post.content);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updatePost(slug, fd);
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
          defaultValue={post.title}
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
          defaultValue={post.category}
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
        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
          Contenido *
        </label>
        <PostEditor value={content} onChange={setContent} rows={16} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-60 transition-opacity"
          style={{ background: 'var(--color-accent)' }}
        >
          {pending ? '⏳ Guardando…' : '💾 Guardar cambios'}
        </button>
        <a
          href={`/comunidad/${slug}`}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
