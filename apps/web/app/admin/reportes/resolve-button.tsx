'use client';

import { useTransition } from 'react';
import { resolveReport } from './actions';

export function ResolveReportButton({ reportId }: { reportId: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-1">
      <button
        onClick={() => start(() => resolveReport(reportId, 'resolved'))}
        disabled={pending}
        className="rounded bg-green-600/80 hover:bg-green-600 text-white px-2 py-0.5 text-[10px] font-medium disabled:opacity-50"
      >
        {pending ? '…' : 'Resolver'}
      </button>
      <button
        onClick={() => start(() => resolveReport(reportId, 'dismissed'))}
        disabled={pending}
        className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] hover:bg-white/5 disabled:opacity-50"
      >
        Descartar
      </button>
    </div>
  );
}
