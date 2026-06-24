'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@academia/db';
import { invalidateAICache } from '@/lib/ai';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin/ia');
  if (session.user.role !== 'ADMIN') throw new Error('No autorizado');
  return session.user;
}

const AIConfigSchema = z.object({
  endpoint:     z.string().url('Endpoint inválido'),
  model:        z.string().min(1, 'Modelo requerido'),
  systemPrompt: z.string().min(10, 'System prompt muy corto'),
  enabled:      z.boolean(),
  maxTokens:    z.coerce.number().int().min(50).max(4000),
  temperature:  z.coerce.number().min(0).max(2),
  rateLimit:    z.coerce.number().int().min(1).max(500),
});

export async function updateAIConfig(formData: FormData) {
  const user = await requireAdmin();

  const parsed = AIConfigSchema.safeParse({
    endpoint:     formData.get('endpoint'),
    model:        formData.get('model'),
    systemPrompt: formData.get('systemPrompt'),
    enabled:      formData.get('enabled') === 'on',
    maxTokens:    formData.get('maxTokens'),
    temperature:  formData.get('temperature'),
    rateLimit:    formData.get('rateLimit'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const { endpoint, model, systemPrompt, enabled, maxTokens, temperature, rateLimit } = parsed.data;

  await prisma.aIConfig.upsert({
    where:  { id: 'default' },
    update: { endpoint, model, systemPrompt, enabled, maxTokens, temperature, rateLimit, updatedBy: user.id },
    create: {
      id: 'default',
      apiKey: process.env.MINIMAX_API_KEY ?? '',
      endpoint, model, systemPrompt, enabled, maxTokens, temperature, rateLimit,
      updatedBy: user.id,
    },
  });

  invalidateAICache();
  revalidatePath('/admin/ia');
}

export async function testAIConnection(formData: FormData): Promise<string> {
  await requireAdmin();

  const apiKey   = process.env.MINIMAX_API_KEY ?? '';
  const endpoint = (formData.get('endpoint') as string) || process.env.MINIMAX_ENDPOINT || 'https://api.minimax.io/v1';
  const model    = (formData.get('model')    as string) || process.env.MINIMAX_MODEL    || 'MiniMax-M2.7-highspeed';

  if (!apiKey) throw new Error('Falta MINIMAX_API_KEY en Vercel Environment Variables');

  let apiUrl = endpoint.replace(/\/+$/, '');
  if (!apiUrl.endsWith('/chat/completions')) apiUrl += '/chat/completions';

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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

  const data    = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('API respondió pero sin contenido válido');

  revalidatePath('/admin/ia');
  return `Modelo respondió: "${content}"`;
}
