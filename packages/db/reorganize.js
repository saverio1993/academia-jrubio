// Reorganiza los archivos: extrae model code del nombre del archivo y busca
// el nombre real del dispositivo. Sin IA, usa una base local de model codes
// conocidos (FCC GSMA, marcas populares). Cuando se conecte IA, se reemplaza
// la función lookupModel().
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

// ============== BASE DE CONOCIMIENTO DE MODEL CODES ==============
// Mapeo de códigos internos → modelo comercial
// Fuentes: GSMArena, FCC, Wikipedia, hojas técnicas de fabricantes
// Cuando se conecte IA, esta función se reemplaza por una consulta al LLM
// con RAG sobre la base de archivos.
const MODEL_DB = {
  // HONOR
  'ALT-LX3': 'Honor X7C',
  'ALT-LX3 8.0.0.191': 'Honor X7C (Android 8)',
  'ELI-NX9': 'Honor 200',
  'ELI-AN00': 'Honor 200 (China)',
  'LLY-LX3': 'Honor X8C',
  'LLY-LX1': 'Honor X8C (Global)',
  'ABR-LX3': 'Honor X8C',
  'ABR-LX1': 'Honor X8C (Global)',
  'ANY-LX3': 'Honor 90 Lite',
  'CRT-LX3': 'Honor X6',
  'NTH-AN00': 'Honor 90',
  'REA-AN00': 'Honor 200 Lite',
  'WDY-LX3': 'Honor X5 Plus',

  // SAMSUNG
  'A055F': 'Samsung Galaxy A05',
  'A065F': 'Samsung Galaxy A06',
  'A065M': 'Samsung Galaxy A06 (LATAM)',
  'A556B': 'Samsung Galaxy A55 5G',
  'A356B': 'Samsung Galaxy A35 5G',
  'A155F': 'Samsung Galaxy A15',
  'A045F': 'Samsung Galaxy A04',
  'A146P': 'Samsung Galaxy A14',
  'A245F': 'Samsung Galaxy A24',
  'A346B': 'Samsung Galaxy A34',
  'A546B': 'Samsung Galaxy A54',
  'A736B': 'Samsung Galaxy A73',
  'SM-A055F': 'Samsung Galaxy A05',
  'SM-A065F': 'Samsung Galaxy A06',
  'SM-A065M': 'Samsung Galaxy A06 (LATAM)',
  'SM-A556B': 'Samsung Galaxy A55 5G',
  'SM-A356B': 'Samsung Galaxy A35 5G',
  'SM-A155F': 'Samsung Galaxy A15',
  'SM-S928B': 'Samsung Galaxy S24 Ultra',
  'SM-S921B': 'Samsung Galaxy S24',
  'SM-G998B': 'Samsung Galaxy S21 Ultra',
  'SM-G991B': 'Samsung Galaxy S21',
  'SM-G996B': 'Samsung Galaxy S21 Plus',
  'SM-A037M': 'Samsung Galaxy A03s',
  'SM-A037F': 'Samsung Galaxy A03s (Global)',
  'SM-A045F': 'Samsung Galaxy A04',
  'SM-A145F': 'Samsung Galaxy A14',
  'SM-A245F': 'Samsung Galaxy A24',
  'SM-A346B': 'Samsung Galaxy A34',
  'SM-A546B': 'Samsung Galaxy A54',
  'SM-A736B': 'Samsung Galaxy A73',

  // XIAOMI / REDMI / POCO
  'beryl': 'Redmi Note 14 5G',
  'spinel': 'Redmi Note 15 4G',
  'creek': 'Redmi 15',
  'dew': 'Redmi 15C',
  'tanzanite': 'Redmi 14C',
  'gale': 'Redmi 13',
  'cobalt': 'Redmi A3',
  'lake': 'Redmi A5',
  'sapphire': 'Redmi A3x',
  'sky': 'Redmi A2',
  'plato': 'POCO C75',
  'plato_global': 'POCO C75 (Global)',

  // HUAWEI
  'ANE-LX3': 'Huawei P20 Lite',
  'ANE-L21': 'Huawei P20 Lite (Global)',
  'JSN-L21': 'Huawei P Smart 2019',
  'POT-LX1': 'Huawei P Smart 2019',
  'HRY-LX3': 'Huawei Y5 2019',
  'DRA-LX3': 'Huawei Y6 2019',
  'STK-LX3': 'Huawei Y7 2019',

  // MOTOROLA
  'moto g84': 'Motorola Moto G84',
  'moto g54': 'Motorola Moto G54',
  'moto g34': 'Motorola Moto G34',
  'moto g24': 'Motorola Moto G24',
  'moto g14': 'Motorola Moto G14',
  'moto g04': 'Motorola Moto G04',
  'moto e14': 'Motorola Moto E14',
};

// Intenta identificar el model code en el nombre del archivo/carpeta
function extractModelCode(filename) {
  // Patrones comunes: ALT-LX3, A556B, SM-A055F, A037M, beryl, creek, etc
  const patterns = [
    /\[?([A-Z]{2,5}-[A-Z]{2,4}(?:\s\d[\d.]+)?)\]?/g,  // ALT-LX3, ANE-LX3
    /\b(SM-[A-Z]\d{3}[A-Z]?)\b/g,                     // SM-A055F
    /\b([A-Z]\d{3}[A-Z])\b/g,                          // A055F, A556B
    /\(([a-z]+)\)/g,                                   // (beryl), (spinel)
    /\b([a-z]{4,8})\b/g,                               // creek, dew, plato
  ];

  const candidates = new Set();
  for (const p of patterns) {
    let m;
    while ((m = p.exec(filename)) !== null) {
      candidates.add(m[1].toUpperCase());
      candidates.add(m[1].toLowerCase());
    }
  }
  return Array.from(candidates);
}

function lookupModel(code) {
  if (!code) return null;
  const upper = code.toUpperCase();
  if (MODEL_DB[upper]) return MODEL_DB[upper];
  if (MODEL_DB[code]) return MODEL_DB[code];
  // Buscar case-insensitive
  for (const [k, v] of Object.entries(MODEL_DB)) {
    if (k.toUpperCase() === upper) return v;
  }
  return null;
}

// ============== REORGANIZACIÓN ==============
(async () => {
  console.log('🔄 Reorganizando archivos por carpeta/modelo...\n');

  const files = await p.fileItem.findMany();
  console.log(`Total archivos: ${files.length}\n`);

  let updated = 0, withModel = 0, withBrand = 0, unchanged = 0;

  for (const f of files) {
    const updates = {};
    const source = `${f.title} ${f.subcategory || ''} ${f.storageKey}`.toLowerCase();
    const original = `${f.title} ${f.storageKey}`;

    // 1. Detectar model code
    const codes = extractModelCode(original);
    let model = null;
    for (const c of codes) {
      const m = lookupModel(c);
      if (m) { model = m; break; }
    }

    // 2. Detectar carpeta padre (si la subcarpeta indica modelo, guardarlo)
    const pathParts = f.storageKey.split('/').filter(Boolean);
    const parentFolder = pathParts.length > 1 ? pathParts[0] : null;
    const grandParent = pathParts.length > 2 ? pathParts[1] : null;

    // 3. Determinar model
    if (model && (!f.model || f.model !== model)) {
      updates.model = model;
      withModel++;
    } else if (grandParent && (!f.model || f.model !== grandParent)) {
      // Si el abuelo es un modelo conocido
      const gm = lookupModel(grandParent);
      if (gm && (!f.model || f.model !== gm)) {
        updates.model = gm;
        withModel++;
      } else if (!f.model && grandParent) {
        // Usar el nombre del abuelo como modelo
        updates.model = grandParent;
        withModel++;
      }
    }

    // 4. Detectar brand del nombre si está mal
    const KNOWN_BRANDS = ['samsung', 'xiaomi', 'redmi', 'poco', 'motorola', 'moto', 'huawei', 'honor', 'oppo', 'vivo', 'tecno', 'infinix', 'iphone', 'apple'];
    const folderLower = (parentFolder || '').toLowerCase();
    const titleLower = f.title.toLowerCase();
    for (const b of KNOWN_BRANDS) {
      if (folderLower.includes(b) || titleLower.includes(b)) {
        const brandName = b === 'moto' ? 'Motorola' : b === 'redmi' || b === 'poco' ? 'Xiaomi' : b.charAt(0).toUpperCase() + b.slice(1);
        if (f.brand === 'Otros' || !f.brand || f.brand !== brandName) {
          updates.brand = brandName;
          withBrand++;
        }
        break;
      }
    }

    // 5. Si tiene parentFolder, usarlo como categoría/subcategoría para agrupar
    if (parentFolder) {
      if (!f.subcategory || f.subcategory !== parentFolder) {
        updates.subcategory = parentFolder;
      }
    }

    if (Object.keys(updates).length > 0) {
      await p.fileItem.update({
        where: { id: f.id },
        data: updates,
      });
      updated++;
      console.log(`✓ ${f.storageKey}`);
      if (updates.model) console.log(`   model: ${updates.model}`);
      if (updates.brand) console.log(`   brand: ${updates.brand}`);
      if (updates.subcategory) console.log(`   subcategory: ${updates.subcategory}`);
    } else {
      unchanged++;
    }
  }

  console.log(`\n\n🎉 Reorganización completa:`);
  console.log(`   ✓ ${updated} actualizados`);
  console.log(`   ↔ ${unchanged} sin cambios`);
  console.log(`   📱 ${withModel} con modelo detectado`);
  console.log(`   🏷️ ${withBrand} con brand corregido`);

  // ============== REPORTE FINAL ==============
  console.log('\n=== Estructura final: brand → subcategory (carpeta) → modelo ===\n');
  const grouped = await p.fileItem.findMany({
    orderBy: [{ brand: 'asc' }, { subcategory: 'asc' }, { model: 'asc' }, { title: 'asc' }],
  });
  let lastBrand = null, lastSub = null;
  for (const f of grouped) {
    if (f.brand !== lastBrand) {
      console.log(`\n📦 ${f.brand}`);
      lastBrand = f.brand;
      lastSub = null;
    }
    if (f.subcategory !== lastSub) {
      console.log(`  📁 ${f.subcategory || 'Sin categoría'}`);
      lastSub = f.subcategory;
    }
    const model = f.model ? ` · ${f.model}` : '';
    const size = f.sizeBytes ? ` · ${(Number(f.sizeBytes) / 1024 / 1024).toFixed(1)}MB` : '';
    console.log(`    📄 ${f.title}${model}${size}`);
  }

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
