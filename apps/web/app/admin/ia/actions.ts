'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@academia/db';
import { invalidateAICache } from '@/lib/ai';
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
  provider: z.enum(['minimax', 'openai', 'anthropic', 'gemini']),
  apiKey: z.string().optional().default(''),
  endpoint: z.string().url('Endpoint inválido'),
  model: z.string().min(1, 'Modelo requerido'),
  systemPrompt: z.string().min(10, 'System prompt muy corto'),
  enabled: z.boolean(),
  maxTokens: z.coerce.number().int().min(50).max(4000),
  temperature: z.coerce.number().min(0).max(2),
  rateLimit: z.coerce.number().int().min(1).max(500),
});

export async function updateAIConfig(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = AIConfigSchema.safeParse({
    provider: formData.get('provider'),
    apiKey: formData.get('apiKey'),
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

  await prisma.aIConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...parsed.data, updatedBy: admin.id },
    update: { ...parsed.data, updatedBy: admin.id },
  });

  invalidateAICache();
  revalidatePath('/admin/ia');
}

export async function testAIConnection(formData: FormData) {
  await requireAdmin();

  const apiKey = formData.get('apiKey') as string;
  const endpoint = formData.get('endpoint') as string;
  const model = formData.get('model') as string;

  if (!apiKey || !endpoint || !model) {
    throw new Error('Completa endpoint, modelo y API key');
  }

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
  if (!data?.choices?.[0]?.message?.content) {
    throw new Error('API respondió pero sin contenido válido');
  }

  // Redirigir con un query param de éxito
  revalidatePath('/admin/ia');
  return data.choices[0].message.content;
}
