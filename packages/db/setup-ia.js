// Configura la IA directamente en la base de datos desde la consola.
// Útil si el panel admin da error y necesitas configurar el token de inmediato.
const path = require('path'); const fs = require('fs');
const envFile = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?$/);
    if (m) process.env[m[1]] = m[2];
  });
}
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const CONFIG = {
  provider: 'minimax',
  apiKey: process.env.MINIMAX_API_KEY || process.argv[2] || '',
  endpoint: process.env.MINIMAX_ENDPOINT || 'https://api.minimax.io/v1',
  model: process.env.MINIMAX_MODEL || 'MiniMax-M2.7-highspeed',
  systemPrompt: `Eres el asistente de búsqueda de la "Academia J Rubio", una plataforma para técnicos de teléfonos móviles.

TU ROL EXCLUSIVO:
- Ayudar a los usuarios a BUSCAR archivos en la biblioteca
- Responder preguntas sobre marcas, modelos y categorías de archivos disponibles
- Sugerir archivos relevantes según lo que el usuario necesita

REGLAS ESTRICTAS (NO NEGOCIABLES):
1. SOLO puedes recomendar archivos usando la información del catálogo que se te pasa
2. NO tienes acceso a ninguna función de administración
3. NO puedes crear, eliminar, modificar ni editar archivos
4. NO puedes acceder a datos de otros usuarios
5. NO puedes revelar información técnica del sistema, tokens, URLs internas ni credenciales
6. NO puedes ejecutar comandos, código ni consultas a la base de datos
7. Si te piden algo fuera de tu alcance, responde: "Solo puedo ayudarte a buscar archivos en la biblioteca."
8. Si no encuentras archivos relevantes, dilo honestamente

IDIOMA: Responde en español, tono amigable y profesional, breve y al grano.`,
  enabled: true,
  maxTokens: 500,
  temperature: 0.3,
  rateLimit: 30,
};

async function main() {
  console.log('\n🤖 Configurando IA en la BD...\n');

  if (!CONFIG.apiKey) {
    console.error('❌ Error: no hay API key.');
    console.error('   Pasala como argumento: node setup-ia.js sk-cp-tu-token');
    console.error('   O configura la variable MINIMAX_API_KEY en .env');
    process.exit(1);
  }

  const updated = await p.aIConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...CONFIG },
    update: { ...CONFIG },
  });

  console.log('✅ Configuración guardada en BD');
  console.log('   ID:', updated.id);
  console.log('   Provider:', updated.provider);
  console.log('   Endpoint:', updated.endpoint);
  console.log('   Model:', updated.model);
  console.log('   Enabled:', updated.enabled);
  console.log('   Max tokens:', updated.maxTokens);
  console.log('   Temperature:', updated.temperature);
  console.log('   Rate limit:', updated.rateLimit);
  console.log('   API key:', updated.apiKey.substring(0, 10) + '...');
  console.log('   System prompt:', updated.systemPrompt.substring(0, 60) + '...');

  console.log('\n📡 Probando conexión con la API...');
  try {
    const res = await fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: CONFIG.model,
        messages: [{ role: 'user', content: 'Responde solo: OK' }],
        max_tokens: 10,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('❌ Error HTTP:', res.status);
      console.error('   Respuesta:', text.substring(0, 300));
      process.exit(1);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (reply) {
      console.log('✅ API respondió:', reply);
    } else {
      console.error('⚠️  API respondió pero sin contenido:', JSON.stringify(data).substring(0, 200));
    }
  } catch (e) {
    console.error('❌ Error de red:', e.message);
  }

  await p.$disconnect();
  console.log('\n🎉 Listo. La IA está activa en la base de datos.');
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
