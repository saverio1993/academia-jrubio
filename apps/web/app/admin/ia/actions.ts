'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin/ia');
  if (session.user.role !== 'ADMIN') {
    throw new Error('No autorizado');
  }
  return session.user;
}

const AIConfigSchema = z.object({
  endpoint: z.string().url('Endpoint inválido'),
  model: z.string().min(1, 'Modelo requerido'),
  systemPrompt: z.string().min(10, 'System prompt muy corto'),
  enabled: z.boolean(),
  maxTokens: z.coerce.number().int().min(50).max(4000),
  temperature: z.coerce.number().min(0).max(2),
  rateLimit: z.coerce.number().int().min(1).max(500),
});

export async function updateAIConfig(formData: FormData) {
  // El panel admin es READ-ONLY desde la versión env-vars.
  // Para cambiar config real, edita las env vars en Vercel y haz redeploy.
  await requireAdmin();

  const parsed = AIConfigSchema.safeParse({
    endpoint: formData.get('endpoint'),
    model: formData.get('model'),
    systemPrompt: formData.get('systemPrompt'),
    enabled: formData.get('enabled') === 'on',
    maxTokens: formData.get('maxTokens'),
    temperature: formData.get('temperature'),
    rateLimit: formData.get('rateLimit'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(', '));
  }

  // No persiste en BD. Mostramos un mensaje informativo.
  revalidatePath('/admin/ia');
}

export async function testAIConnection(formData: FormData) {
  await requireAdmin();

  const apiKey = (formData.get('apiKey') as string) || process.env.MINIMAX_API_KEY || '';
  const endpoint = (formData.get('endpoint') as string) || process.env.MINIMAX_ENDPOINT || 'https://api.minimax.io/v1';
  const model = (formData.get('model') as string) || process.env.MINIMAX_MODEL || 'MiniMax-M2.7-highspeed';

  if (!apiKey) {
    throw new Error('Falta MINIMAX_API_KEY en Vercel Environment Variables');
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Responde solo con OK' }],
        max_tokens: 10,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text.substring(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API respondió pero sin contenido válido');
    }

    // Log en consola del servidor (visible en Vercel logs)
    console.log(`[AI test OK] ${content}`);
    revalidatePath('/admin/ia');
  } catch (e) {
    throw new Error(`Error: ${e instanceof Error ? e.message : 'desconocido'}`);
  }
}
