import { assertAdmin } from '@/lib/admin';
import { PageHeader, Card } from '../_components/ui';
import { BotSetupPanel } from './bot-setup-panel';

export const dynamic = 'force-dynamic';

export default async function AdminBotPage() {
  await assertAdmin();
  const tokenOk = !!(process.env.TELEGRAM_BOT_TOKEN);
  const appUrl  = process.env.APP_URL ?? '';
  const appUrlOk = !!appUrl && !appUrl.includes('localhost');

  return (
    <>
      <PageHeader
        title="Bot de Telegram"
        subtitle="Configuración del webhook y comandos del bot"
      />

      {/* Estado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className={`p-5 border ${tokenOk ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tokenOk ? '✅' : '❌'}</span>
            <div>
              <p className="font-semibold text-sm">Token del bot</p>
              <p className="text-xs text-[var(--color-muted)]">
                {tokenOk ? 'TELEGRAM_BOT_TOKEN configurado' : 'Falta TELEGRAM_BOT_TOKEN en Vercel'}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-5 border ${appUrlOk ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{appUrlOk ? '✅' : '⚠️'}</span>
            <div>
              <p className="font-semibold text-sm">URL de producción</p>
              <p className="text-xs text-[var(--color-muted)] truncate">
                {appUrl || 'APP_URL no configurada'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-semibold text-sm">Comandos disponibles</p>
              <p className="text-xs text-[var(--color-muted)]">/buscar · /mifirmware · inline</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Panel de setup interactivo */}
      <BotSetupPanel tokenOk={tokenOk} appUrlOk={appUrlOk} />

      {/* Instrucciones */}
      <Card className="p-5 mt-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <span>📋</span> Cómo configurar paso a paso
        </h2>
        <ol className="space-y-4 text-sm text-[var(--color-muted)]">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="text-[var(--color-fg)] font-medium">Crear el bot en BotFather</p>
              <p>Habla con <span className="font-mono text-xs bg-white/10 px-1 rounded">@BotFather</span> en Telegram → <span className="font-mono text-xs bg-white/10 px-1 rounded">/newbot</span> → te da un token</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className="text-[var(--color-fg)] font-medium">Agregar el token en Vercel</p>
              <p>Vercel Dashboard → tu proyecto → <b>Settings → Environment Variables</b> → agrega <span className="font-mono text-xs bg-white/10 px-1 rounded">TELEGRAM_BOT_TOKEN</span> con el token. Luego redeploya.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <p className="text-[var(--color-fg)] font-medium">Activar modo inline en BotFather</p>
              <p><span className="font-mono text-xs bg-white/10 px-1 rounded">/setinline</span> → elige tu bot → escribe un texto de ejemplo ej: <i>"Samsung A55"</i></p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center text-xs font-bold">4</span>
            <div>
              <p className="text-[var(--color-fg)] font-medium">Registrar el webhook</p>
              <p>Haz clic en el botón <b>"Registrar webhook"</b> de arriba. Eso conecta el bot con esta plataforma.</p>
            </div>
          </li>
        </ol>
      </Card>
    </>
  );
}
