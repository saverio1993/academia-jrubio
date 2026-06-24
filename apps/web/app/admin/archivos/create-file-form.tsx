'use client';

import { useRef, useState, useTransition } from 'react';
import { FileUploadInput, FileUploadHandle } from './file-upload-input';
import { createFile } from './actions';

const inputCls = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]';

const BRANDS     = ['Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Vivo', 'Tecno', 'Infinix', 'iPhone', 'Otros'];
const CATEGORIES = ['firmware', 'drivers', 'herramientas', 'tutoriales', 'certificados', 'root', 'frp', 'unlock'];

export function CreateFileForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<FileUploadHandle>(null);

  const [hasFile,   setHasFile]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  const busy = uploading || isPending;
  const btnText = uploading ? 'Subiendo archivo…' : isPending ? 'Guardando…' : 'Subir y registrar';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!fileRef.current?.hasFile()) {
      setError('Selecciona un archivo para subir');
      return;
    }

    const fd     = new FormData(e.currentTarget);
    const brand  = ((fd.get('brand')    as string) ?? '').trim();
    const model  = ((fd.get('model')    as string) ?? '').trim();
    const cat    = ((fd.get('category') as string) ?? '').trim();
    const folder = [brand, model, cat].filter(Boolean).join('/') || 'General';

    // 1. Subir a Nextcloud
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

    // 2. Guardar en base de datos
    fd.set('storageKey',   result.storageKey);
    fd.set('__sizeBytes',  String(result.size));
    if (result.mime) fd.set('__mimeType', result.mime);

    startTransition(async () => {
      try {
        await createFile(fd);
        setSuccess(true);
        setHasFile(false);
        formRef.current?.reset();
        setTimeout(() => setSuccess(false), 4000);
      } catch (err) {
        setError((err as Error).message ?? 'Error al guardar');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Metadatos */}
      <Field name="title"       label="Título *"                  placeholder="Firmware Samsung A55"  required />
      <Field name="brand"       label="Marca *"    list="brands"   placeholder="Samsung"               required />
      <Field name="category"    label="Categoría *" list="categories" placeholder="firmware"           required />
      <Field name="model"       label="Modelo"                     placeholder="A556B" />
      <Field name="subcategory" label="Subcategoría"               placeholder="oficial" />
      <Field name="version"     label="Versión"                    placeholder="A556BXXU5BWK1" />
      <Field name="tags"        label="Tags (separados por coma)"  placeholder="frp, android 14" />
      <Field name="description" label="Descripción"                placeholder="…" className="lg:col-span-2" />

      <datalist id="brands">    {BRANDS.map((b)     => <option key={b} value={b} />)}</datalist>
      <datalist id="categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>

      {/* Archivo — selector + barra de progreso en el mismo bloque */}
      <div className="lg:col-span-3 rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <p className="mb-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
          Archivo
        </p>
        <FileUploadInput
          ref={fileRef}
          onFileSelected={(f) => { setHasFile(f !== null); setError(''); }}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPremium" defaultChecked className="accent-orange-500" />
        Premium (requiere suscripción)
      </label>

      {/* UN solo botón */}
      <div className="lg:col-span-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !hasFile}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
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

function Field({
  name, label, placeholder, required, list, className = '',
}: {
  name: string; label: string; placeholder?: string;
  required?: boolean; list?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-[var(--color-muted)]">{label}</span>
      <input name={name} list={list} required={required} placeholder={placeholder} className={inputCls} />
    </label>
  );
}
