'use client';

import { useTransition } from 'react';
import { deactivateCoupon } from './actions';

export function DeactivateButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('¿Desactivar este cupón? Ya no podrá ser usado.')) return;
        start(() => deactivateCoupon(id));
      }}
      disabled={pending}
      className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20 disabled:opacity-50"
    >
      {pending ? '…' : 'Desactivar'}
    </button>
  );
}
