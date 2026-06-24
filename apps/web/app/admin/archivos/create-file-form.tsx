'use client';

import { useRef, useState, useTransition } from 'react';
import { FileUploadInput, FileUploadHandle } from './file-upload-input';
import { createFile } from './actions';

const inputCls = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]';

const BRANDS = [
  'Samsung', 'Honor', 'Huawei', 'Xiaomi', 'Redmi', 'POCO',
  'Motorola', 'Oppo', 'Vivo', 'Tecno', 'Infinix', 'Realme',
  'OnePlus', 'Nokia', 'LG', 'Alcatel', 'ZTE', 'Lenovo',
  'Asus', 'iPhone', 'Otros',
];
const CATEGORIES = ['firmware', 'drivers', 'herramientas', 'tutoriales', 'certificados', 'root', 'frp', 'unlock'];

// ── Auto-detector desde nombre de archivo ──────────────────────────────────
const BRAND_MAP: [RegExp, string][] = [
  [/\bhonor\b/i,    'Honor'],
  [/\bhuawei\b/i,   'Huawei'],
  [/\bsamsung\b/i,  'Samsung'],
  [/\bxiaomi\b/i,   'Xiaomi'],
  [/\bredmi\b/i,    'Xiaomi'],
  [/\bpoco\b/i,     'Xiaomi'],
  [/\bmotorola\b/i, 'Motorola'],
  [/\bmoto\b/i,     'Motorola'],
  [/\boppo\b/i,     'Oppo'],
  [/\bvivo\b/i,     'Vivo'],
  [/\btecno\b/i,    'Tecno'],
  [/\binfinix\b/i,  'Infinix'],
  [/\brealme\b/i,   'Realme'],
  [/\boneplus\b/i,  'OnePlus'],
  [/\bnokia\b/i,    'Nokia'],
  [/\blg\b/i,       'LG'],
  [/\balcatel\b/i,  'Alcatel'],
  [/\bzte\b/i,      'ZTE'],
  [/\blenovo\b/i,   'Lenovo'],
  [/\basus\b/i,     'Asus'],
  [/\biphone\b/i,   'iPhone'],
  [/\bapple\b/i,    'iPhone'],
];

const CAT_MAP: [RegExp, string][] = [
  [/\bfrp\b/i,                    'frp'],
  [/\bbypass\b/i,                 'frp'],
  [/\bunlock\b|desbloqueo/i,      'unlock'],
  [/\broot\b|\btwrp\b|\bmagisk\b/i, 'root'],
  [/\bdriver/i,                   'drivers'],
  [/\bherramienta|tool/i,         'herramientas'],
  [/\btutorial/i,                 'tutoriales'],
  [/\bfirmware\b|\brom\b|\bflash\b|\bdump\b|\bstock\b/i, 'firmware'],
];

function inferFromFile(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_\-]/g, ' ');

  let brand = '';
  for (const [re, val] of BRAND_MAP) {
    if (re.test(base)) { brand = val; break; }
  }

  let category = 'firmware';
  for (const [re, val] of CAT_MAP) {
    if (re.test(base)) { category = val; break; }
  }

  // Versión: patrón tipo V1.2, A556BXXU5BWK1, 5BWK1, etc.
  const verMatch =
    base.match(/\b[A-Z]{2,}\d[A-Z0-9]{4,}\b/) ||
    base.match(/\bV\d[\d.]*\b/i);
  const version = verMatch ? verMatch[0].trim() : '';

  // Modelo: palabras que quedan después de quitar marca + extensión
  const modelRaw = base
    .replace(new RegExp(brand, 'gi'), '')
    .replace(/\bfrp\b|\bfirmware\b|\brom\b|\bflash\b|\bdriver\b|\broot\b|\bdump\b|\bbypass\b|\bunlock\b|\bherramienta\b|\btool\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const model = modelRaw.length > 1 ? modelRaw : '';

  const title = base.replace(/\s{2,}/g, ' ').trim();

  return { brand, category, version, model, title };
}

interface Fields {
  title: string;
  brand: string;
  category: string;
  model: string;
  subcategory: string;
  version: string;
  tags: string;
  description: string;
}

const EMPTY: Fields = { title: '', brand: '', category: '', model: '', subcategory: '', version: '', tags: '', description: '' };

export function CreateFileForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<FileUploadHandle>(null);

  const [fields,    setFields]    = useState<Fields>(EMPTY);
  const [hasFile,   setHasFile]   = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  const busy = uploading || isPending;
  const btnText = uploading ? 'Subiendo archivo…' : isPending ? 'Guardando…' : 'Subir y registrar';

  function set(k: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFields(prev => ({ ...prev, [k]: e.target.value }));
  }

  function handleFileSelected(file: File | null) {
    setHasFile(file !== null);
    setError('');
    if (!file) { setAutoFilled(false); return; }

    const inferred = inferFromFile(file.name);
    setFields(prev => ({
      ...prev,
      title:    inferred.title    || prev.title,
      brand:    inferred.brand    || prev.brand,
      category: inferred.category || prev.category,
      model:    inferred.model    || prev.model,
      version:  inferred.version  || prev.version,
    }));
    setAutoFilled(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!fileRef.current?.hasFile()) { setError('Selecciona un archivo para subir'); return; }

    const folder = [fields.brand, fields.model, fields.category].filter(Boolean).join('/') || 'General';

    setUploading(true);
    let result;
    try {
      result = await fileRef.current.upload(folder);
    } catch (err) {
      setError((err as Error).message);
      setUploading(false);
      return;
    }
    setUploading(false);

    const fd = new FormData();
    (Object.keys(fields) as (keyof Fields)[]).forEach(k => fd.set(k, fields[k]));
    fd.set('storageKey',  result.storageKey);
    fd.set('__sizeBytes', String(result.size));
    if (result.mime) fd.set('__mimeType', result.mime);
    if (isPremium) fd.set('isPremium', 'on');

    startTransition(async () => {
      try {
        await createFile(fd);
        setSuccess(true);
        setHasFile(false);
        setAutoFilled(false);
        setFields(EMPTY);
        formRef.current?.reset();
        setTimeout(() => setSuccess(false), 4000);
      } catch (err) {
        setError((err as Error).message ?? 'Error al guardar');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

      {/* Archivo — va primero para que el auto-relleno aparezca visible */}
      <div className="lg:col-span-3 rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <p className="mb-1 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
          Archivo
        </p>
        {autoFilled && (
          <p className="mb-2 text-xs text-[var(--color-accent)]">
            ✦ Campos detectados automáticamente desde el nombre del archivo — revisa y corrige si es necesario.
          </p>
        )}
        <FileUploadInput
          ref={fileRef}
          onFileSelected={handleFileSelected}
        />
      </div>

      {/* Metadatos — controlados para poder auto-rellenar */}
      <label className="block">
        <span className="mb-1 block text-xs text-[var(--color-muted)]">Título *</span>
        <input name="title" value={fields.title} onChange={set('title')} required
          placeholder="Firmware Honor 90" className={inputCls} />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-[var(--color-muted)]">Marca *</span>
        <input name="brand" value={fields.brand} onChange={set('brand')} required
          list="brands" placeholder="Honor" className={inputCls} />
        <datalist id="brands">{BRANDS.map(b => <option key={b} value={b} />)}</datalist>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-[var(--color-muted)]">Categoría *</span>
        <select name="category" value={fields.category} onChange={set('category')} required className={inputCls}>
          <option value="">— Selecciona —</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-[var(--color-muted)]">Modelo</span>
        <input name="model" value={fields.model} onChange={set('model')}
          placeholder="Honor 90 5G" className={inputCls} />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-[var(--color-muted)]">Subcategoría</span>
        <input name="subcategory" value={fields.subcategory} onChange={set('subcategory')}
          placeholder="oficial" className={inputCls} />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-[var(--color-muted)]">Versión</span>
        <input name="version" value={fields.version} onChange={set('version')}
          placeholder="V2.0.0 / REA-NX9" className={inputCls} />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-[var(--color-muted)]">Tags (separados por coma)</span>
        <input name="tags" value={fields.tags} onChange={set('tags')}
          placeholder="frp, android 14" className={inputCls} />
      </label>

      <label className="block lg:col-span-2">
        <span className="mb-1 block text-xs text-[var(--color-muted)]">Descripción</span>
        <input name="description" value={fields.description} onChange={set('description')}
          placeholder="Descripción opcional" className={inputCls} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)}
          className="accent-orange-500" />
        Premium (requiere suscripción)
      </label>

      <div className="lg:col-span-3 flex items-center gap-3 flex-wrap">
        <button type="submit" disabled={busy || !hasFile}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed">
          {btnText}
        </button>
        {success && <span className="text-sm text-green-400">✓ Archivo registrado</span>}
        {error   && <span className="text-sm text-red-400">{error}</span>}
        {!hasFile && !busy && !success && (
          <span className="text-xs text-[var(--color-muted)]">Selecciona un archivo para continuar</span>
        )}
      </div>
    </form>
  );
}
