import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader, Card, Field, inputCls } from '../_components/ui';
import { updateAIConfig } from './actions';
import { getAIConfigReadOnly, DEFAULT_SYSTEM_PROMPT } from '@/lib/ai';
import TestAIButton from './test-button';

export const dynamic = 'force-dynamic';

export default async function IAPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin/ia');
  if (session.user.role !== 'ADMIN') redirect('/');

  const config = await getAIConfigReadOnly();
  const hasKey      = !!config?.apiKey;
  const enabled     = config?.enabled     ?? false;
  const endpoint    = config?.endpoint    ?? 'https://api.minimax.io/v1';
  const model       = config?.model       ?? 'MiniMax-M2.7-highspeed';
  const systemPrompt = config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const maxTokens   = config?.maxTokens   ?? 500;
  const temperature = config?.temperature ?? 0.3;
  const rateLimit   = config?.rateLimit   ?? 30;
  const source      = config?.source      ?? 'env';

  const maskedKey = hasKey
    ? `${config!.apiKey.substring(0, 7)}...${config!.apiKey.substring(config!.apiKey.length - 4)}`
    : '— (no configurado)';

  return (
    <>
      <PageHeader
        title="Asistente de IA"
        subtitle={source === 'db' ? 'Configuración guardada en base de datos.' : 'Usando valores de env vars (aún no guardado en BD).'}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Configuración</h2>

          <form action={updateAIConfig} className="space-y-4">
            {/* Toggle activo */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white/5 px-4 py-3">
              <div>
                <p className="font-medium">Asistente activo</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {enabled ? 'Los usuarios pueden chatear con la IA' : 'Chat deshabilitado temporalmente'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="enabled" defaultChecked={enabled} className="sr-only peer" />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
              </label>
            </div>

            {/* API Key — solo lectura, se gestiona en Vercel */}
            <div>
              <label className={inputCls + ' block'}>API Key (token)</label>
              <div className="rounded-lg border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm font-mono text-[var(--color-muted)]">
                {maskedKey}
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Gestiona el token en <span className="text-[var(--color-fg)]">Vercel → Settings → Environment Variables → MINIMAX_API_KEY</span>
              </p>
            </div>

            <Field name="endpoint"     label="Endpoint URL"  type="text"   defaultValue={endpoint}        placeholder="https://api.minimax.io/v1" />
            <Field name="model"        label="Modelo"        type="text"   defaultValue={model}           placeholder="MiniMax-M2.7-highspeed" />
            <Field name="systemPrompt" label="System Prompt (instrucciones para la IA)" type="textarea" defaultValue={systemPrompt} rows={10} />

            <div className="grid grid-cols-3 gap-3">
              <Field name="maxTokens"   label="Max tokens"      type="number" defaultValue={String(maxTokens)}   min={50}  max={4000} />
              <Field name="temperature" label="Temperatura"      type="number" defaultValue={String(temperature)} min={0}   max={2}    step={0.1} />
              <Field name="rateLimit"   label="Rate limit /min"  type="number" defaultValue={String(rateLimit)}   min={1}   max={500} />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Guardar cambios
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="font-semibold mb-2">Probar conexión</h2>
            <p className="text-xs text-[var(--color-muted)] mb-4">
              Envía un mensaje de prueba a la API con la configuración actual.
            </p>
            <TestAIButton apiKey={config?.apiKey ?? ''} endpoint={endpoint} model={model} />
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-2">Fuente de config</h2>
            <div className="space-y-2 text-xs text-[var(--color-muted)]">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${source === 'db' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                {source === 'db' ? 'Configuración guardada en base de datos' : 'Usando env vars (guarda para migrar a BD)'}
              </div>
              <p className="mt-2">
                El API Key siempre se lee de <code className="text-[var(--color-fg)]">MINIMAX_API_KEY</code> (Vercel).
                El resto (prompt, modelo, etc.) se guarda en BD al hacer clic en "Guardar cambios".
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
