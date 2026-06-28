'use client';

import { useTransition } from 'react';
import { pinPost, setPostStatus, deletePost } from './actions';

interface Props {
  postId: string;
  title: string;
  pinned: boolean;
  status: string;
}

export function PostRowActions({ postId, title, pinned, status }: Props) {
  const [pending, start] = useTransition();

  const btn = 'text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] transition-colors disabled:opacity-40';

  return (
    <div className="flex items-center gap-1.5">
      {/* Pin toggle */}
      <button
        onClick={() => start(() => pinPost(postId, !pinned))}
        disabled={pending}
        title={pinned ? 'Desfijar' : 'Fijar'}
        className={btn}
        style={pinned ? { color: 'var(--color-accent)' } : { color: 'var(--color-muted)' }}
      >
        📌
      </button>

      {/* Close / Open toggle */}
      {status === 'CLOSED' ? (
        <button
          onClick={() => start(() => setPostStatus(postId, 'PUBLISHED'))}
          disabled={pending}
          title="Reabrir"
          className={`${btn} hover:text-green-500`}
          style={{ color: 'var(--color-muted)' }}
        >
          🔓
        </button>
      ) : (
        <button
          onClick={() => start(() => setPostStatus(postId, 'CLOSED'))}
          disabled={pending}
          title="Cerrar tema"
          className={`${btn} hover:text-yellow-500`}
          style={{ color: 'var(--color-muted)' }}
        >
          🔒
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => {
          if (!confirm(`¿Eliminar "${title}"? Esta acción es irreversible.`)) return;
          start(() => deletePost(postId));
        }}
        disabled={pending}
        title="Eliminar"
        className={`${btn} hover:text-red-500`}
        style={{ color: 'var(--color-muted)' }}
      >
        {pending ? '⏳' : '🗑️'}
      </button>
    </div>
  );
}
