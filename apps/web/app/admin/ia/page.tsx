import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader, Card, Field, inputCls } from '../_components/ui';
import { updateAIConfig } from './actions';
import { getAIConfigReadOnly } from '@/lib/ai';
import TestAIButton from './test-button';

export const dynamic = 'force-dynamic';

export default async function IAPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin/ia');
  if (session.user.role !== 'ADMIN') redirect('/');

  // Cargar config desde env vars (read-only, no toca BD)
  const config = await getAIConfigReadOnly();
  const hasKey = !!config?.apiKey;
  const enabled = config?.enabled ?? false;
  const endpoint = config?.endpoint ?? 'https://api.minimax.io/v1';
  const model = config?.model ?? 'MiniMax-M2.7-highspeed';
  const systemPrompt = config?.systemPrompt ?? '';
  const maxTokens = config?.maxTokens ?? 500;
  const temperature = config?.temperature ?? 0.3;
  const rateLimit = config?.rateLimit ?? 30;

  // Máscara del token para mostrar
  const maskedKey = hasKey
    ? `${config!.apiKey.substring(0, 7)}...${config!.apiKey.substring(config!.apiKey.length - 4)}`
    : '— (no configurado)';

  return (
    <>
      <PageHeader
        title="Asistente de IA"
        subtitle="Configuración en modo lectura (Vercel Environment Variables)."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Configuración actual</h2>

          <div className="mb-4 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-3">
            <p className="text-sm font-medium text-[var(--color-accent)]">
              Modo lectura: edita los valores en Vercel &gt; Settings &gt; Environment Variables y haz redeploy.
            </p>
          </div>

          <form action={updateAIConfig} className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white/5 px-4 py-3">
              <div>
                <p className="font-medium">Asistente activo</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {enabled ? 'Los usuarios pueden chatear con la IA' : 'Chat deshabilitado temporalmente'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
              </label>
            </div>

            <div>
              <label className={inputCls + ' block'}>API Key (token)</label>
              <div className="rounded-lg border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm font-mono">
                {maskedKey}
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Variable: <code className="text-[var(--color-fg)]">MINIMAX_API_KEY</code>
              </p>
            </div>

            <Field
              name="endpoint"
              label="Endpoint URL"
              type="text"
              defaultValue={endpoint}
              placeholder="https://api.minimax.io/v1"
            />

            <Field
              name="model"
              label="Modelo"
              type="text"
              defaultValue={model}
              placeholder="MiniMax-M2.7-highspeed"
            />

            <Field
              name="systemPrompt"
              label="System Prompt (instrucciones para la IA)"
              type="textarea"
              defaultValue={systemPrompt}
              rows={8}
            />

            <div className="grid grid-cols-3 gap-3">
              <Field
                name="maxTokens"
                label="Max tokens"
                type="number"
                defaultValue={String(maxTokens)}
                min={50}
                max={4000}
              />
              <Field
                name="temperature"
                label="Temperatura"
                type="number"
                defaultValue={String(temperature)}
                min={0}
                max={2}
                step={0.1}
              />
              <Field
                name="rateLimit"
                label="Rate limit /min"
                type="number"
                defaultValue={String(rateLimit)}
                min={1}
                max={500}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
                Validar formulario
              </button>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Este botón solo valida que los valores sean correctos. Para aplicarlos, edita las env vars de Vercel.
            </p>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="font-semibold mb-2">Probar conexión</h2>
            <p className="text-xs text-[var(--color-muted)] mb-4">
              Envía un mensaje de prueba a la API con los valores actuales (env vars).
            </p>
            <TestAIButton
              apiKey={config?.apiKey ?? ''}
              endpoint={endpoint}
              model={model}
            />
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-2">Variables de entorno en Vercel</h2>
            <p className="text-xs text-[var(--color-muted)] mb-3">
              Configura estas variables en Vercel &gt; Settings &gt; Environment Variables:
            </p>
            <ul className="text-xs font-mono space-y-1.5 text-[var(--color-fg)]">
              <li><span className="text-[var(--color-accent)]">MINIMAX_API_KEY</span>=sk-cp-...</li>
              <li><span className="text-[var(--color-accent)]">MINIMAX_ENDPOINT</span>={endpoint}</li>
              <li><span className="text-[var(--color-accent)]">MINIMAX_MODEL</span>={model}</li>
              <li><span className="text-[var(--color-accent)]">MINIMAX_ENABLED</span>=true</li>
              <li><span className="text-[var(--color-accent)]">MINIMAX_MAX_TOKENS</span>={String(maxTokens)}</li>
              <li><span className="text-[var(--color-accent)]">MINIMAX_TEMPERATURE</span>={String(temperature)}</li>
              <li><span className="text-[var(--color-accent)]">MINIMAX_RATE_LIMIT</span>={String(rateLimit)}</li>
              <li className="text-[var(--color-muted)]">MINIMAX_SYSTEM_PROMPT=(opcional, multilinea)</li>
            </ul>
            <p className="text-xs text-[var(--color-muted)] mt-3">
              Después de cambiar una env var, haz redeploy (Vercel &gt; Deployments &gt; Redeploy).
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
