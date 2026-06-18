import { prisma } from '@academia/db';
import { bytes, dateShort } from '@/lib/format';
import { PageHeader, Card, Badge, Empty, inputCls, btnDanger } from '../_components/ui';
import { createFile, updateFile, deleteFile } from './actions';

export const dynamic = 'force-dynamic';

const BRANDS = ['Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Vivo', 'Tecno', 'Infinix', 'iPhone', 'Otros'];
const CATEGORIES = ['firmware', 'drivers', 'herramientas', 'tutoriales', 'certificados', 'root', 'frp', 'unlock'];

export default async function ArchivosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { brand: { contains: q, mode: 'insensitive' as const } },
          { model: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const files = await prisma.fileItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <>
      <PageHeader title="Archivos" subtitle={`${files.length} archivo(s) en la biblioteca`} />

      {/* Crear archivo */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-semibold">Agregar archivo</h2>
        <form action={createFile} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field name="title" label="Título *" placeholder="Firmware Samsung A55" required />
          <Field name="brand" label="Marca *" list="brands" placeholder="Samsung" required />
          <Field name="category" label="Categoría *" list="categories" placeholder="firmware" required />
          <Field name="model" label="Modelo" placeholder="A556B" />
          <Field name="subcategory" label="Subcategoría" placeholder="oficial" />
          <Field name="version" label="Versión" placeholder="A556BXXU5BWK1" />
          <Field
            name="storageKey"
            label="Ruta en Nextcloud *"
            placeholder="/samsung/a55/firmware.zip"
            required
            className="lg:col-span-2"
          />
          <Field name="tags" label="Tags (separados por coma)" placeholder="frp, android 14" />
          <Field name="description" label="Descripción" placeholder="…" className="lg:col-span-3" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPremium" defaultChecked className="accent-[var(--color-accent)]" />
            Premium (requiere suscripción)
          </label>
          <div className="lg:col-span-3">
            <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
              Agregar archivo
            </button>
          </div>
        </form>
      </Card>

      <datalist id="brands">
        {BRANDS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="categories">
        {CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <form className="mb-5 flex gap-2" action="/admin/archivos">
        <input name="q" defaultValue={q ?? ''} placeholder="Buscar archivos…" className={inputCls + ' max-w-sm'} />
        <button className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5">
          Buscar
        </button>
      </form>

      {files.length === 0 ? (
        <Empty>No hay archivos. Agrega el primero arriba.</Empty>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <Card key={f.id} className="overflow-hidden">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{f.title}</p>
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {f.brand} {f.model ? `· ${f.model}` : ''} · {f.category}
                      {f.version ? ` · ${f.version}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--color-muted)]">
                    {f.isPremium ? <Badge color="orange">Premium</Badge> : <Badge color="gray">Libre</Badge>}
                    <span className="hidden sm:inline">{bytes(f.sizeBytes)}</span>
                    <span>{f.downloadsCount} ⬇</span>
                    <span className="hidden md:inline">{dateShort(f.createdAt)}</span>
                  </div>
                </summary>

                <div className="border-t border-[var(--color-border)] p-5">
                  <form action={updateFile} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input type="hidden" name="id" value={f.id} />
                    <Field name="title" label="Título" defaultValue={f.title} />
                    <Field name="brand" label="Marca" defaultValue={f.brand} list="brands" />
                    <Field name="category" label="Categoría" defaultValue={f.category} list="categories" />
                    <Field name="model" label="Modelo" defaultValue={f.model ?? ''} />
                    <Field name="subcategory" label="Subcategoría" defaultValue={f.subcategory ?? ''} />
                    <Field name="version" label="Versión" defaultValue={f.version ?? ''} />
                    <Field name="storageKey" label="Ruta en Nextcloud" defaultValue={f.storageKey} className="lg:col-span-2" />
                    <Field name="tags" label="Tags" defaultValue={f.tags.join(', ')} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isPremium" defaultChecked={f.isPremium} className="accent-[var(--color-accent)]" />
                      Premium
                    </label>
                    <div className="flex items-center gap-3 lg:col-span-3">
                      <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
                        Guardar
                      </button>
                    </div>
                  </form>
                  <form action={deleteFile} className="mt-3">
                    <input type="hidden" name="id" value={f.id} />
                    <button className={btnDanger}>Eliminar archivo</button>
                  </form>
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
  list,
  required,
  className = '',
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  list?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-[var(--color-muted)]">{label}</span>
      <input
        name={name}
        list={list}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={inputCls}
      />
    </label>
  );
}
