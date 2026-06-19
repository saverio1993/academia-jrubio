// Verifica que el cliente de Prisma tenga el modelo AIConfig
// y que la tabla exista en la BD
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

(async () => {
  console.log('🔍 Verificando modelo AIConfig...\n');

  // 1. Verificar que el modelo existe en el cliente
  if (typeof p.aIConfig === 'undefined') {
    console.error('❌ El cliente de Prisma NO tiene el modelo aIConfig');
    console.error('   Esto significa que el `prisma generate` se ejecutó con un schema viejo');
    console.error('   Solución: corre `npx prisma generate` en packages/db');
    process.exit(1);
  }
  console.log('✅ Modelo aIConfig existe en el cliente');

  // 2. Verificar que la tabla existe
  try {
    const result = await p.$queryRaw`SELECT EXISTS (SELECT 1 FROM "AIConfig" WHERE id = 'default') as exists`;
    console.log('✅ Tabla AIConfig existe en la BD');
    console.log('   Existe registro default:', result[0].exists);
  } catch (e) {
    console.error('❌ La tabla AIConfig no existe en la BD:', e.message);
    process.exit(1);
  }

  // 3. Verificar que se puede escribir
  try {
    const cfg = await p.aIConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
    console.log('✅ Lectura/escritura funciona');
    console.log('   Enabled:', cfg.enabled);
    console.log('   Endpoint:', cfg.endpoint);
    console.log('   Model:', cfg.model);
    console.log('   API key (length):', cfg.apiKey.length);
  } catch (e) {
    console.error('❌ Error al leer/escribir:', e.message);
    process.exit(1);
  }

  await p.$disconnect();
  console.log('\n🎉 Todo OK');
})();
