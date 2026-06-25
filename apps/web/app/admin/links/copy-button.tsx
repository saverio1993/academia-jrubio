'use client';

import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] hover:bg-white/5 whitespace-nowrap transition-colors">
      {copied ? '✓ Copiado' : '📋 Copiar'}
    </button>
  );
}
