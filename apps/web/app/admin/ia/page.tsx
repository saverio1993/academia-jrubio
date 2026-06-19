import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { PageHeader, Card, Field, inputCls } from '../_components/ui';
import { updateAIConfig, testAIConnection } from './actions';

export const dynamic = 'force-dynamic';

export default async function IAPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin/ia');
  if (session.user.role !== 'ADMIN') redirect('/');

  let config = await prisma.aIConfig.findUnique({ where: { id: 'default' } });
  if (!config) {
    config = await prisma.aIConfig.create({
      data: {
        id: 'default',
        systemPrompt: 'Eres el asistente de búsqueda de la Academia J Rubio. SOLO puedes ayudar a buscar archivos en la biblioteca. NO tienes acceso a admin ni a funciones de modificación. Responde en español, breve y amigable.',
      },
    });
  }

  return (
    <>
      <PageHeader
        title="Asistente de IA"
        subtitle="Configura el chat de búsqueda con IA. Los cambios se aplican al instante."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario principal */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Configuración</h2>
          <form action={updateAIConfig} className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white/5 px-4 py-3">
              <div>
                <p className="font-medium">Asistente activo</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {config.enabled ? 'Los usuarios pueden chatear con la IA' : 'Chat deshabilitado temporalmente'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={config.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
              </label>
            </div>

            <Field
              name="provider"
              label="Proveedor"
              type="select"
              defaultValue={config.provider}
              options={[
                { value: 'minimax', label: 'Minimax (Minimax.io)' },
                { value: 'openai', label: 'OpenAI' },
                { value: 'anthropic', label: 'Anthropic' },
                { value: 'gemini', label: 'Google Gemini' },
              ]}
            />

            <Field
              name="apiKey"
              label="API Key (token)"
              type="password"
              placeholder="sk-... o sk-cp-..."
              defaultValue={config.apiKey}
            />

            <Field
              name="endpoint"
              label="Endpoint URL"
              type="text"
              defaultValue={config.endpoint}
              placeholder="https://api.minimax.io/v1"
            />

            <Field
              name="model"
              label="Modelo"
              type="text"
              defaultValue={config.model}
              placeholder="MiniMax-M2.7-highspeed"
            />

            <Field
              name="systemPrompt"
              label="System Prompt (instrucciones para la IA)"
              type="textarea"
              defaultValue={config.systemPrompt}
              rows={8}
            />

            <div className="grid grid-cols-3 gap-3">
              <Field
                name="maxTokens"
                label="Max tokens"
                type="number"
                defaultValue={String(config.maxTokens)}
                min={50}
                max={4000}
              />
              <Field
                name="temperature"
                label="Temperatura"
                type="number"
                defaultValue={String(config.temperature)}
                min={0}
                max={2}
                step={0.1}
              />
              <Field
                name="rateLimit"
                label="Rate limit /min"
                type="number"
                defaultValue={String(config.rateLimit)}
                min={1}
                max={500}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
                Guardar cambios
              </button>
            </div>
          </form>
        </Card>

        {/* Test de conexión + info */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="font-semibold mb-2">Probar conexión</h2>
            <p className="text-xs text-[var(--color-muted)] mb-4">
              Envía un mensaje de prueba a la API con los valores actuales del formulario.
              No guarda nada, solo verifica que la configuración funciona.
            </p>
            <form action={testAIConnection} className="space-y-3">
              <input type="hidden" name="apiKey" defaultValue={config.apiKey} />
              <input type="hidden" name="endpoint" defaultValue={config.endpoint} />
              <input type="hidden" name="model" defaultValue={config.model} />
              <button className="w-full rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20">
                Probar ahora
              </button>
              <p className="text-xs text-[var(--color-muted)]">
                Si la API responde correctamente, verás el resultado en la consola del navegador.
              </p>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-2">Última actualización</h2>
            <p className="text-xs text-[var(--color-muted)]">
              {new Date(config.updatedAt).toLocaleString('es-PA')}
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-2">
              El chat en /archivos refleja esta configuración en menos de 5 segundos.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-2">Cómo configurar Minimax</h2>
            <ol className="text-xs text-[var(--color-muted)] space-y-1.5 list-decimal pl-4">
              <li>Endpoint: <code className="text-[var(--color-fg)]">https://api.minimax.io/v1</code></li>
              <li>Modelo: <code className="text-[var(--color-fg)]">MiniMax-M2.7-highspeed</code></li>
              <li>API Key: empieza con <code className="text-[var(--color-fg)]">sk-cp-</code></li>
              <li>Marca "Asistente activo" en ON</li>
              <li>Click "Guardar cambios"</li>
              <li>Vuelve a /archivos y prueba el chat</li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
