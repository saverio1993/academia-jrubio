// Reasignar archivos a sus categorías correctas basado en el nombre de carpeta padre
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

// Reglas basadas en el nombre de la CARPETA PADRE
// (más confiable que el nombre del archivo)
const FOLDER_RULES = [
  // Samsung
  { match: /^SAMFW|^samfw/i, set: { brand: 'Samsung', category: 'firmware', subcategory: 'SAMFW' } },
  { match: /Magic\s*\d*\s*Lite|magic\s*\d*\s*lite/i, set: { brand: 'Honor', category: 'dump', subcategory: 'Magic Dump' } },
  { match: /Odin|odin/i, set: { brand: 'Samsung', category: 'herramientas', subcategory: 'Odin Tools' } },
  { match: /DUMP SAMSUNG/i, set: { brand: 'Samsung', category: 'dump', subcategory: 'DUMP Samsung' } },
  { match: /Honor X\dC/i, set: { brand: 'Honor', category: 'dump', subcategory: 'Honor Dump' } },
  { match: /HONOR \d{3,4}/i, set: { brand: 'Honor', category: 'dump', subcategory: 'Honor Dump' } },

  // Xiaomi
  { match: /DUMP.*XIAOMI/i, set: { brand: 'Xiaomi', category: 'dump', subcategory: 'DUMP Xiaomi' } },

  // Honor
  { match: /DUMP HONOR/i, set: { brand: 'Honor', category: 'dump', subcategory: 'DUMP Honor' } },

  // Drivers
  { match: /^Drivers?$|^drivers?$/i, set: { brand: 'Otros', category: 'drivers', subcategory: 'Drivers' } },

  // Tools
  { match: /Flash\d+|FLASH\d+/i, set: { brand: 'Otros', category: 'herramientas', subcategory: 'BOX Flash Tools' } },
  { match: /BOX/i, set: { brand: 'Otros', category: 'herramientas', subcategory: 'BOX Tools' } },
];

// Reglas basadas en el nombre del ARCHIVO
const FILE_RULES = [
  { match: /SAMFW\.COM/i, set: { brand: 'Samsung', category: 'firmware', subcategory: 'SAMFW' } },
  { match: /Honor.*Dump|honor.*dump/i, set: { brand: 'Honor', category: 'dump', subcategory: 'Honor Dump' } },
  { match: /Honor.*Reset/i, set: { brand: 'Honor', category: 'misc', subcategory: 'Honor Tools' } },
  { match: /Fastboot\s*Driver/i, set: { brand: 'Otros', category: 'drivers', subcategory: 'Drivers' } },
  { match: /DUMP.*GPT.*EASYJTAG/i, set: { brand: 'Samsung', category: 'dump', subcategory: 'DUMP EASYJTAG' } },
];

(async () => {
  const files = await p.fileItem.findMany();
  console.log(`Total archivos: ${files.length}\n`);

  let updated = 0;
  const log = [];

  for (const f of files) {
    const parts = f.storageKey.split('/').filter(Boolean);
    const parentFolder = parts.length > 1 ? parts[0] : null;
    const updates = {};

    // 1. Aplicar reglas de carpeta
    if (parentFolder) {
      for (const rule of FOLDER_RULES) {
        if (rule.match.test(parentFolder)) {
          for (const [key, value] of Object.entries(rule.set)) {
            if (f[key] !== value) updates[key] = value;
          }
          break;
        }
      }
    }

    // 2. Aplicar reglas de archivo (más fuerte)
    const source = f.title;
    for (const rule of FILE_RULES) {
      if (rule.match.test(source)) {
        for (const [key, value] of Object.entries(rule.set)) {
          if (f[key] !== value) updates[key] = value;
        }
        break;
      }
    }

    if (Object.keys(updates).length > 0) {
      await p.fileItem.update({ where: { id: f.id }, data: updates });
      updated++;
      log.push({ title: f.title, key: f.storageKey, ...updates });
    }
  }

  console.log(`✅ ${updated} archivos recategorizados\n`);
  // Mostrar primeros 30 cambios
  log.slice(0, 30).forEach(c => {
    console.log(`✓ ${c.title}`);
    console.log(`  ${Object.entries(c).filter(([k]) => !['title', 'key'].includes(k)).map(([k, v]) => `${k}: ${v}`).join(' | ')}`);
  });

  // Resumen por brand/category
  console.log('\n=== Resumen por brand → category ===');
  const all = await p.fileItem.findMany();
  const grouped = {};
  for (const f of all) {
    const key = `${f.brand} > ${f.category}`;
    grouped[key] = (grouped[key] || 0) + 1;
  }
  Object.entries(grouped).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${k}: ${n}`));

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
