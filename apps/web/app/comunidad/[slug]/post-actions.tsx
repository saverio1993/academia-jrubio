'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteOwnPost } from '../actions';

interface Props {
  slug: string;
  title: string;
  canEdit: boolean;
}

export function PostActions({ slug, title, canEdit }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleShare() {
    const url = `${window.location.origin}/comunidad/${slug}`;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('¡Enlace copiado al portapapeles!');
      });
    }
  }

  function handleDelete() {
    if (!confirm('¿Eliminar esta publicación? Esta acción es irreversible.')) return;
    startTransition(async () => {
      await deleteOwnPost(slug);
      router.push('/comunidad');
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-[var(--color-border)]">
      {/* Share — visible para todos */}
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 transition-colors"
      >
        🔗 Compartir
      </button>

      {canEdit && (
        <>
          <Link
            href={`/comunidad/${slug}/editar`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            ✏️ Editar
          </Link>

          <button
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-50"
          >
            {pending ? '⏳' : '🗑️'} Eliminar
          </button>
        </>
      )}
    </div>
  );
}
