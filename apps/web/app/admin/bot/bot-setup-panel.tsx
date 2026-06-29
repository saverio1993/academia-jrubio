'use client';

import { useState, useEffect } from 'react';
import { Card } from '../_components/ui';

interface WebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_message?: string;
}

export function BotSetupPanel({ tokenOk, appUrlOk }: { tokenOk: boolean; appUrlOk: boolean }) {
  const [status, setStatus]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [webhook, setWebhook] = useState<WebhookInfo | null>(null);

  useEffect(() => {
    fetch('/api/telegram/setup')
      .then(r => r.json())
      .then(d => { if (d.webhook) setWebhook(d.webhook); })
      .catch(() => {});
  }, []);

  async function register() {
    setStatus('loading');
    setMessage('');
    try {
      const res  = await fetch('/api/telegram/setup', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setStatus('ok');
        setMessage(`✅ Webhook registrado: ${data.webhookUrl}`);
        // Refrescar info
        const r2 = await fetch('/api/telegram/setup');
        const d2 = await r2.json();
        if (d2.webhook) setWebhook(d2.webhook);
      } else {
        setStatus('error');
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch {
      setStatus('error');
      setMessage('❌ Error de conexión');
    }
  }

  const canRegister = tokenOk && appUrlOk;

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <span>🔗</span> Webhook del bot
      </h2>

      {/* Estado actual del webhook */}
      {webhook && (
        <div className="mb-4 rounded-lg p-3 border border-[var(--color-border)] bg-[var(--color-card)]">
          <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Webhook actual</p>
          <p className="text-sm font-mono break-all">
            {webhook.url || <span className="text-[var(--color-muted)]">Sin webhook registrado</span>}
          </p>
          {webhook.pending_update_count > 0 && (
            <p className="text-xs text-yellow-400 mt-1">{webhook.pending_update_count} mensajes en cola</p>
          )}
          {webhook.last_error_message && (
            <p className="text-xs text-red-400 mt-1">Último error: {webhook.last_error_message}</p>
          )}
        </div>
      )}

      {/* Botón */}
      <button
        onClick={register}
        disabled={!canRegister || status === 'loading'}
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: canRegister ? 'var(--color-accent)' : undefined }}
      >
        {status === 'loading' ? '⏳ Registrando...' : '🔗 Registrar webhook ahora'}
      </button>

      {!tokenOk && (
        <p className="mt-2 text-xs text-red-400">
          Primero agrega <span className="font-mono bg-white/10 px-1 rounded">TELEGRAM_BOT_TOKEN</span> en Vercel → Settings → Environment Variables y redeploya.
        </p>
      )}
      {tokenOk && !appUrlOk && (
        <p className="mt-2 text-xs text-yellow-400">
          <span className="font-mono bg-white/10 px-1 rounded">APP_URL</span> debe ser la URL de producción (no localhost). Agrégala en Vercel y redeploya.
        </p>
      )}

      {message && (
        <p className={`mt-3 text-sm rounded-lg p-3 ${status === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message}
        </p>
      )}
    </Card>
  );
}
