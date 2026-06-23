'use client';

import { useRef, useState, useTransition } from 'react';
import { FileUploadInput } from './file-upload-input';
import { createFile } from './actions';

const inputCls = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]';

const BRANDS = ['Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Vivo', 'Tecno', 'Infinix', 'iPhone', 'Otros'];
const CATEGORIES = ['firmware', 'drivers', 'herramientas', 'tutoriales', 'certificados', 'root', 'frp', 'unlock'];

export function CreateFileForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [storageKey, setStorageKey] = useState('');
  const [sizeBytes, setSizeBytes] = useState<number | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  function handleUploaded(key: string, size: number, mime: string | null) {
    setStorageKey(key);
    setSizeBytes(size);
    setMimeType(mime);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (storageKey) fd.set('storageKey', storageKey);
    if (sizeBytes !== null) fd.set('__sizeBytes', String(sizeBytes));
    if (mimeType) fd.set('__mimeType', mimeType);

    startTransition(async () => {
      await createFile(fd);
      setSuccess(true);
      setStorageKey('');
      setSizeBytes(null);
      setMimeType(null);
      formRef.current?.reset();
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Metadatos */}
      <Field name="title" label="Título *" placeholder="Firmware Samsung A55" required />
      <Field name="brand" label="Marca *" list="brands" placeholder="Samsung" required />
      <Field name="category" label="Categoría *" list="categories" placeholder="firmware" required />
      <Field name="model" label="Modelo" placeholder="A556B" />
      <Field name="subcategory" label="Subcategoría" placeholder="oficial" />
      <Field name="version" label="Versión" placeholder="A556BXXU5BWK1" />
      <Field name="tags" label="Tags (separados por coma)" placeholder="frp, android 14" />
      <Field name="description" label="Descripción" placeholder="…" className="lg:col-span-2" />

      <datalist id="brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
      <datalist id="categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>

      {/* Subir archivo con progreso */}
      <div className="lg:col-span-3 rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <p className="mb-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
          📁 Subir archivo a Nextcloud
        </p>
        <FileUploadInput onUploaded={handleUploaded} />
        {storageKey && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Ruta: <code className="text-green-400">{storageKey}</code>
          </p>
        )}
      </div>

      {/* Ruta manual (alternativa) */}
      {!storageKey && (
        <div className="lg:col-span-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">
              O ingresa ruta manual si el archivo ya está en Nextcloud
            </span>
            <input
              name="storageKey"
              placeholder="Samsung/A55/Firmware/archivo.zip"
              className={inputCls}
            />
          </label>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPremium" defaultChecked className="accent-orange-500" />
        Premium (requiere suscripción)
      </label>

      <div className="lg:col-span-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || (!storageKey && true)}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Guardando…' : 'Agregar archivo'}
        </button>
        {success && <span className="text-sm text-green-400">✓ Archivo registrado</span>}
        {!storageKey && (
          <span className="text-xs text-[var(--color-muted)]">
            Sube el archivo primero o ingresa la ruta manual
          </span>
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
