// Sync Nextcloud -> DB: sincroniza carpeta "base de datos Academia"
// Detecta automáticamente marcas (Samsung, Xiaomi, etc) y categorías (DUMP, etc)
const path = require('path');
const fs = require('fs');

const envFile = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const baseUrl = process.env.NEXTCLOUD_URL;
const username = process.env.NEXTCLOUD_USER;
const appPassword = process.env.NEXTCLOUD_APP_PASSWORD;
// Apuntamos a la carpeta "AcademiaJRubio" (donde están todos los archivos)
const basePath = '/AcademiaJRubio';

const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getlastmodified/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`;

async function listFolder(remotePath) {
  const url = `${baseUrl}/remote.php/dav/files/${username}${remotePath}`;
  const res = await fetch(url, {
    method: 'PROPFIND',
    headers: {
      Authorization: `Basic ${auth}`,
      Depth: '1',
      'Content-Type': 'application/xml',
    },
    body: PROPFIND_BODY,
  });
  if (!res.ok) {
    console.error('  ✗ Error listando', remotePath, ':', res.status, res.statusText);
    return [];
  }
  const text = await res.text();
  const items = [];
  const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/g;
  let match;
  while ((match = responseRegex.exec(text)) !== null) {
    const block = match[1];
    const hrefMatch = /<d:href>(.*?)<\/d:href>/.exec(block);
    if (!hrefMatch) continue;
    const href = decodeURIComponent(hrefMatch[1]);
    const cleanHref = href.replace(/\/$/, '');
    const cleanBase = basePath.replace(/\/$/, '');
    if (cleanHref === `/remote.php/dav/files/${username}${cleanBase}`) continue;

    const isDir = /<d:collection\s*\/>/.test(block);
    const name = href.replace(/\/$/, '').split('/').pop();
    const sizeMatch = /<d:getcontentlength>(\d+)<\/d:getcontentlength>/.exec(block);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : null;
    const typeMatch = /<d:getcontenttype>(.*?)<\/d:getcontenttype>/.exec(block);
    const contentType = typeMatch ? typeMatch[1] : null;
    items.push({ href, name, isDir, size, contentType });
  }
  return items;
}

async function exploreAll() {
  const all = [];
  const visited = new Set(); // evitar loops por subcarpetas con el mismo nombre
  async function walk(currentPath, prefix = '', depth = 0) {
    if (depth > 6) return; // límite de seguridad
    if (visited.has(currentPath)) return;
    visited.add(currentPath);

    const items = await listFolder(currentPath);
    // Filtrar subcarpetas con el mismo nombre que el padre (bug de Nextcloud)
    const parentName = currentPath.split('/').pop();
    const filtered = items.filter(item => !(item.isDir && item.name === parentName));

    filtered.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const item of filtered) {
      if (item.isDir) {
        console.log(prefix + '📂 ' + item.name + '/');
        all.push({ ...item, fullPath: currentPath + '/' + item.name, depth });
        await walk(currentPath + '/' + item.name, prefix + '  ', depth + 1);
      } else {
        const sizeKb = item.size ? `(${(item.size / 1024).toFixed(1)} KB)` : '';
        console.log(prefix + '📄 ' + item.name + ' ' + sizeKb);
        all.push({ ...item, fullPath: currentPath + '/' + item.name, depth });
      }
    }
  }
  await walk(basePath, '');
  return all;
}

// Mapeo de carpetas a marcas
const BRAND_MAP = {
  'samsung': 'Samsung',
  'xiaomi': 'Xiaomi',
  'redmi': 'Xiaomi',
  'poco': 'Xiaomi',
  'motorola': 'Motorola',
  'moto': 'Motorola',
  'huawei': 'Huawei',
  'honor': 'Honor',
  'oppo': 'Oppo',
  'vivo': 'Vivo',
  'tecno': 'Tecno',
  'infinix': 'Infinix',
  'lg': 'LG',
  'iphone': 'iPhone',
  'apple': 'iPhone',
  'box': 'Box', // multi-marca
};

// Categorías por palabras clave
const CATEGORY_KEYWORDS = {
  'firmware': ['firmware', 'rom', 'stock', 'oficial'],
  'dump': ['dump'],
  'tools': ['tools', 'herramientas', 'tool'],
  'drivers': ['driver', 'usb'],
  'tutoriales': ['tutorial', 'guia', 'guide', 'manual', 'howto'],
  'certificados': ['cert', 'certificado'],
  'root': ['root', 'magisk', 'twrp'],
  'frp': ['frp', 'cuenta-google', 'google-account'],
  'unlock': ['unlock', 'desbloqueo', 'bootloader'],
  'misc': ['misc', 'reset', 'bin'],
};

function inferMetadata(fullPath) {
  const rest = fullPath.replace(basePath, '').replace(/^\//, '');
  const parts = rest.split('/').filter(Boolean);
  // parts[0] = carpeta de marca (DUMP SAMSUNG, BOX, etc)

  const folderName = parts[0] || '';
  const folderLower = folderName.toLowerCase();

  // Detectar marca
  let brand = 'Otros';
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    if (folderLower.includes(key)) {
      brand = val;
      break;
    }
  }

  // Detectar categoría por el folder o nombre
  let category = 'otros';
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => folderLower.includes(k) || fullPath.toLowerCase().includes(k))) {
      category = cat;
      break;
    }
  }

  // Modelo: si hay 3 niveles (samsung/A55/archivo), el modelo es parts[1]
  // Si no, intentar extraer del nombre del archivo
  let model = null;
  let subcategory = null;
  if (parts.length >= 3) {
    model = parts[1];
    subcategory = parts.slice(2, -1).join('/') || null;
  } else if (parts.length === 2) {
    // archivo suelto en la raíz de la carpeta de marca
    subcategory = folderName;
  }

  // Si es archivo suelto en raíz (BOX, pasarss, etc), subcategory = folder
  if (parts.length === 1) {
    subcategory = folderName;
  }

  return { brand, model, category, subcategory, folderName };
}

(async () => {
  try {
    console.log('\n🌐 Conectando a Nextcloud:', baseUrl);
    console.log('📁 Carpeta:', basePath);
    console.log('\n=== Explorando estructura ===\n');

    const allItems = await exploreAll();
    const files = allItems.filter(i => !i.isDir);

    console.log(`\n\n📊 Total: ${allItems.filter(i => i.isDir).length} carpetas, ${files.length} archivos\n`);

    if (files.length === 0) {
      console.log('⚠️  No se encontraron archivos. Verifica la ruta en Nextcloud.');
      console.log('   Esperado: /AcademiaJRubio/files/base de datos Academia/');
      await p.$disconnect();
      return;
    }

    console.log('=== Archivos con metadata inferida ===\n');
    const filesWithMeta = files.map(f => ({ file: f, meta: inferMetadata(f.fullPath) }));

    for (const { file, meta } of filesWithMeta) {
      const relKey = file.fullPath.replace(basePath, '').replace(/^\//, '');
      const sizeStr = file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '0 B';
      console.log(`📄 ${file.name}`);
      console.log(`   path:   ${relKey}`);
      console.log(`   brand:  ${meta.brand} | cat: ${meta.category} | sub: ${meta.subcategory || '-'} | model: ${meta.model || '-'}`);
      console.log(`   size:   ${sizeStr}`);
      console.log('');
    }

    // Sincronizar a BD
    console.log('\n=== Sincronizando con la base de datos ===\n');
    let created = 0, updated = 0, skipped = 0;

    for (const { file, meta } of filesWithMeta) {
      const relKey = file.fullPath.replace(basePath, '').replace(/^\//, '');

      const tags = [
        meta.brand.toLowerCase(),
        meta.model?.toLowerCase(),
        meta.category,
        meta.folderName.toLowerCase().replace(/\s+/g, '-'),
      ].filter(Boolean);

      const title = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Decidir si es premium: por defecto todo premium, excepto herramientas/certificados
      const isPremium = !['certificados', 'tools'].includes(meta.category);

      const data = {
        title,
        brand: meta.brand,
        model: meta.model,
        category: meta.category,
        subcategory: meta.subcategory,
        storageKey: relKey,
        sizeBytes: file.size ? BigInt(file.size) : null,
        tags,
        isPremium,
      };

      const existing = await p.fileItem.findFirst({ where: { storageKey: relKey } });

      if (existing) {
        await p.fileItem.update({ where: { id: existing.id }, data });
        console.log('🔄 UPDATED:', relKey);
        updated++;
      } else {
        await p.fileItem.create({ data });
        console.log('✅ CREATED:', relKey);
        created++;
      }
    }

    console.log(`\n\n🎉 Sincronización completa:`);
    console.log(`   ✅ ${created} creados`);
    console.log(`   🔄 ${updated} actualizados`);
    console.log(`   ⏭️  ${skipped} saltados`);

    // Resumen por marca
    console.log('\n=== Resumen por marca ===');
    const byBrand = {};
    for (const { meta } of filesWithMeta) {
      byBrand[meta.brand] = (byBrand[meta.brand] || 0) + 1;
    }
    Object.entries(byBrand)
      .sort((a, b) => b[1] - a[1])
      .forEach(([b, n]) => console.log(`   ${b}: ${n} archivos`));

    await p.$disconnect();
  } catch (e) {
    console.error('Error fatal:', e);
    await p.$disconnect();
    process.exit(1);
  }
})();
