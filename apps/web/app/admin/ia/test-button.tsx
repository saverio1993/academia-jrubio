'use client';

import { useState, useTransition } from 'react';
import { testAIConnection } from './actions';

interface Props {
  apiKey: string;
  endpoint: string;
  model: string;
}

export default function TestAIButton({ apiKey, endpoint, model }: Props) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTest() {
    setResult(null);
    const formData = new FormData();
    formData.set('apiKey', apiKey);
    formData.set('endpoint', endpoint);
    formData.set('model', model);

    startTransition(async () => {
      try {
        const res = await testAIConnection(formData);
        setResult({ ok: true, message: res });
      } catch (e) {
        setResult({ ok: false, message: e instanceof Error ? e.message : 'Error desconocido' });
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleTest}
        disabled={isPending}
        className="w-full rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Probando...' : 'Probar ahora'}
      </button>

      {result && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs font-mono ${
            result.ok
              ? 'border-green-500/30 bg-green-500/10 text-green-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <p className="font-semibold mb-1">
            {result.ok ? '✅ Conexión exitosa' : '❌ Error de conexión'}
          </p>
          <p className="whitespace-pre-wrap break-words">{result.message}</p>
        </div>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        El resultado se muestra aquí mismo al hacer click.
      </p>
    </div>
  );
}
