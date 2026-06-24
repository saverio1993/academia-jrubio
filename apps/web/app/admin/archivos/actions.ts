'use server';

import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { assertAdminOrModerator, logAudit } from '@/lib/admin';

// ── Sincronizar desde Nextcloud ──────────────────────────────────────────────

const NC_URL  = process.env.NEXTCLOUD_URL  ?? 'https://cloud.heyvalue.com';
const NC_USER = process.env.NEXTCLOUD_USER ?? '';
const NC_PASS = process.env.NEXTCLOUD_APP_PASSWORD ?? '';
const NC_BASE = (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/^\//, '');

// Extensiones que vale la pena registrar como archivo descargable
const GOOD_EXT = new Set([
  'zip','rar','7z','tar','gz','bz2','xz',
  '001','002','003','004','005','006','007','008','009',
  'apk','exe','bat','msi','img','bin','kdz','ops','fls',
]);
// Extensiones a ignorar siempre
const SKIP_EXT = new Set(['ping','xml','txt','md','DS_Store']);

// Nombres de archivos que son particiones de dump (ej: Lun_0_P01_ssd.bin)
function isPartitionDump(filename: string): boolean {
  return /^Lun_\d+_P\d+_/i.test(filename);
}

function ext(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? (parts[parts.length - 1] ?? '').toLowerCase() : '';
}

// Inferir categoría desde el path
function inferCategory(pathParts: string[]): string {
  const joined = pathParts.join('/').toLowerCase();
  if (pathParts[0]?.toLowerCase() === 'drivers') return 'drivers';
  if (pathParts[0]?.toLowerCase() === 'tutoriales') return 'tutoriales';
  if (joined.includes('frp'))    return 'frp';
  if (joined.includes('root'))   return 'root';
  return 'firmware';
}

// Limpiar nombre de modelo (quitar keywords de categoría)
function cleanModel(raw: string): string {
  return raw
    .replace(/\b(DUMP|FRP|ENG|ENGE|ENGR|ROM|FIRMWARE|SCATTER|MISC|VERSIONES?|VIEJAS?)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
}

export async function syncFromNextcloud(): Promise<SyncResult> {
  await assertAdminOrModerator();

  const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');
  const davBase    = `${NC_URL}/remote.php/dav/files/${NC_USER}/${NC_BASE}`;

  // 1. PROPFIND recursivo — obtener todos los archivos de Nextcloud
  const res = await fetch(`${davBase}/`, {
    method: 'PROPFIND',
    headers: { Authorization: authHeader, Depth: 'infinity', 'Content-Type': 'application/xml' },
    body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:resourcetype/></d:prop></d:propfind>`,
  });

  if (!res.ok) throw new Error(`Nextcloud PROPFIND falló: ${res.status} — verifica NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_APP_PASSWORD`);
  const xml = await res.text();

  // 2. Parsear bloques <d:response>
  const responseBlocks = xml.split('<d:response>').slice(1);
  const ncFiles = new Map<string, bigint>(); // storageKey → size

  for (const block of responseBlocks) {
    if (/<d:collection/.test(block)) continue; // es carpeta, ignorar

    const hrefMatch = /<d:href>([^<]+)<\/d:href>/.exec(block);
    const sizeMatch = /<d:getcontentlength>(\d+)<\/d:getcontentlength>/.exec(block);
    if (!hrefMatch) continue;

    const href    = decodeURIComponent(hrefMatch[1] ?? '');
    const davPath = `/remote.php/dav/files/${NC_USER}/${NC_BASE}/`;
    if (!href.startsWith(davPath)) continue;

    const relative = href.slice(davPath.length);
    if (!relative) continue;

    // Filtrar por extensión
    const parts    = relative.split('/');
    const filename = parts[parts.length - 1] ?? '';
    const fileExt  = ext(filename);
    if (!filename || filename.startsWith('.')) continue;
    if (SKIP_EXT.has(fileExt))               continue;
    if (isPartitionDump(filename))            continue;
    if (!GOOD_EXT.has(fileExt) && fileExt !== '') continue;

    ncFiles.set(relative, BigInt(sizeMatch?.[1] ?? '0'));
  }

  // 3. Cargar BD actual
  const dbItems = await prisma.fileItem.findMany({ select: { id: true, storageKey: true } });
  const dbByKey = new Map(dbItems.map(f => [f.storageKey, f.id]));

  const result: SyncResult = { added: 0, updated: 0, deleted: 0, skipped: 0, errors: [] };

  // 4. Eliminar de BD los que ya no existen en Nextcloud
  const toDelete = dbItems.filter(f => !ncFiles.has(f.storageKey));
  if (toDelete.length > 0) {
    await prisma.fileItem.deleteMany({ where: { id: { in: toDelete.map(f => f.id) } } });
    result.deleted = toDelete.length;
  }

  // 5. Agregar / actualizar los de Nextcloud
  for (const [path, size] of ncFiles.entries()) {
    const parts    = path.split('/');
    const filename = parts[parts.length - 1] ?? '';
    const brand    = parts[0] ?? 'General';
    const rawModel = parts.length > 2 ? parts.slice(1, -1).join(' / ') : null;
    const model    = rawModel ? cleanModel(rawModel) || null : null;
    const category = inferCategory(parts as string[]);
    const title    = filename.replace(/\.[^.]+$/, '');

    const data = {
      title,
      brand,
      model:      model || null,
      category,
      storageKey: path,
      sizeBytes:  size > 0n ? size : null,
      isPremium:  true,
    };

    try {
      const existingId = dbByKey.get(path);
      if (existingId) {
        await prisma.fileItem.update({ where: { id: existingId }, data });
        result.updated++;
      } else {
        await prisma.fileItem.create({ data });
        result.added++;
      }
    } catch (e) {
      result.errors.push(`${path}: ${(e as Error).message}`);
    }
  }

  revalidatePath('/admin/archivos');
  revalidatePath('/archivos');
  revalidatePath('/api/ticker');
  return result;
}

function parseTags(raw: string): string[] {
  return String(raw ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function safeSlug(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');
}

export async function createFile(formData: FormData) {
  const admin = await assertAdminOrModerator();
  const title    = String(formData.get('title') ?? '').trim();
  const brand    = String(formData.get('brand') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();

  if (!title || !brand || !category) {
    throw new Error('Faltan campos obligatorios (título, marca, categoría)');
  }

  let storageKey  = String(formData.get('storageKey') ?? '').trim();
  let sizeBytes: bigint | null = null;
  let mimeType: string | null  = null;

  // Fields set by CreateFileForm after XHR upload to /api/admin/upload-file
  const rawSize = formData.get('__sizeBytes');
  const rawMime = formData.get('__mimeType');
  if (rawSize) sizeBytes = BigInt(Math.round(Number(rawSize)));
  if (rawMime) mimeType  = String(rawMime);

  if (!storageKey) {
    throw new Error('Sube un archivo o ingresa la ruta de Nextcloud manualmente');
  }

  const created = await prisma.fileItem.create({
    data: {
      title,
      brand,
      category,
      storageKey,
      sizeBytes,
      mimeType,
      model:       String(formData.get('model') ?? '').trim() || null,
      subcategory: String(formData.get('subcategory') ?? '').trim() || null,
      version:     String(formData.get('version') ?? '').trim() || null,
      description: String(formData.get('description') ?? '').trim() || null,
      tags:        parseTags(String(formData.get('tags') ?? '')),
      isPremium:   formData.get('isPremium') === 'on',
    },
  });
  await logAudit(admin.id, 'file.created', `file:${created.id}`, { title, brand });
  revalidatePath('/admin/archivos');
  revalidatePath('/api/ticker');
}

export async function updateFile(formData: FormData) {
  const admin = await assertAdminOrModerator();
  const id = String(formData.get('id'));
  const title = String(formData.get('title') ?? '').trim();
  const brand = String(formData.get('brand') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const storageKey = String(formData.get('storageKey') ?? '').trim();
  if (!id || !title || !brand || !category || !storageKey) throw new Error('Datos inválidos');

  await prisma.fileItem.update({
    where: { id },
    data: {
      title,
      brand,
      category,
      storageKey,
      model: String(formData.get('model') ?? '').trim() || null,
      subcategory: String(formData.get('subcategory') ?? '').trim() || null,
      version: String(formData.get('version') ?? '').trim() || null,
      tags: parseTags(String(formData.get('tags') ?? '')),
      isPremium: formData.get('isPremium') === 'on',
    },
  });
  await logAudit(admin.id, 'file.updated', `file:${id}`, { title });
  revalidatePath('/admin/archivos');
}

export async function deleteFile(formData: FormData) {
  const admin = await assertAdminOrModerator();
  const id = String(formData.get('id'));
  if (!id) throw new Error('Archivo inválido');
  await prisma.fileItem.delete({ where: { id } });
  await logAudit(admin.id, 'file.deleted', `file:${id}`);
  revalidatePath('/admin/archivos');
}

export async function generateOneTimeLink(
  _prev: { url: string } | null,
  formData: FormData,
): Promise<{ url: string }> {
  const admin = await assertAdminOrModerator();
  const fileId = String(formData.get('fileId'));
  const days = Math.min(Math.max(Number(formData.get('days') ?? 7), 1), 30);
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!fileId) throw new Error('Archivo inválido');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const link = await prisma.oneTimeLink.create({
    data: { fileItemId: fileId, createdById: admin.id, expiresAt, note },
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const url = `${appUrl}/dl/${link.token}`;

  await logAudit(admin.id, 'file.onetimelink.created', `file:${fileId}`, { url, days, note });
  return { url };
}
