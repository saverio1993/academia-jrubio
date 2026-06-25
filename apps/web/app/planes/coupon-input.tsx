'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  appliedCode?: string;
  discountLabel?: string;
}

export function CouponInput({ appliedCode, discountLabel }: Props) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, start] = useTransition();

  function apply() {
    if (!code.trim()) return;
    setError('');
    start(async () => {
      const res  = await fetch(`/api/cupones/validate?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json() as { valid: boolean; code?: string; message?: string };
      if (data.valid && data.code) {
        router.push(`/planes?coupon=${encodeURIComponent(data.code)}`);
      } else {
        setError(data.message ?? 'Cupón inválido.');
      }
    });
  }

  if (appliedCode && discountLabel) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8, padding: '6px 14px',
        }}>
          <span style={{ color: '#4ade80', fontSize: 13 }}>✓ Cupón</span>
          <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{appliedCode}</span>
          <span style={{ color: '#4ade80', fontSize: 13 }}>aplicado · {discountLabel}</span>
        </div>
        <button
          onClick={() => router.push('/planes')}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && apply()}
          placeholder="¿Tienes un cupón?"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            color: 'inherit',
            fontFamily: 'monospace',
            width: 200,
            outline: 'none',
          }}
        />
        <button
          onClick={apply}
          disabled={loading || !code.trim()}
          style={{
            background: loading ? 'rgba(249,115,22,0.4)' : 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.4)',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            color: '#fb923c',
            cursor: loading ? 'default' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? '…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p style={{ marginTop: 6, fontSize: 12, color: '#f87171' }}>{error}</p>
      )}
    </div>
  );
}
