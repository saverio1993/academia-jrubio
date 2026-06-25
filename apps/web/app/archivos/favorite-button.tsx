'use client';

import { useState, useTransition } from 'react';
import { toggleFavorite } from './favorite-action';

export function FavoriteButton({ fileItemId, initialFav }: { fileItemId: string; initialFav: boolean }) {
  const [isFav, setIsFav] = useState(initialFav);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleFavorite(fileItemId);
      setIsFav(result.isFav);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title={isFav ? 'Quitar de guardados' : 'Guardar'}
      className="inline-flex items-center justify-center w-5 h-5 rounded transition-colors disabled:opacity-40 hover:scale-110"
      style={{ color: isFav ? '#f97316' : 'var(--color-muted)', opacity: isFav ? 1 : 0.4 }}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  );
}
