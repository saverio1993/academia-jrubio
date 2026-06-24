'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BRAND_META: { name: string; emoji: string }[] = [
  { name: 'Samsung',  emoji: '🌀' },
  { name: 'Xiaomi',   emoji: '🔶' },
  { name: 'Motorola', emoji: '〽️' },
  { name: 'Huawei',   emoji: '🌸' },
  { name: 'Honor',    emoji: '🏅' },
  { name: 'Oppo',     emoji: '🔷' },
  { name: 'Vivo',     emoji: '🎵' },
  { name: 'Tecno',    emoji: '🔆' },
  { name: 'Infinix',  emoji: '⚡' },
  { name: 'Google',   emoji: '🔍' },
  { name: 'iPhone',   emoji: '🍎' },
  { name: 'LG',       emoji: '🔵' },
  { name: 'Otros',    emoji: '📱' },
];

const CATEGORIES = [
  { value: 'Todas',        label: 'Todas las categorías' },
  { value: 'firmware',     label: '💾 Firmware' },
  { value: 'frp',          label: '🔓 FRP' },
  { value: 'root',         label: '⚡ Root' },
  { value: 'drivers',      label: '🔧 Drivers' },
  { value: 'unlock',       label: '🔑 Unlock' },
  { value: 'dump',         label: '💿 Dump' },
  { value: 'tutoriales',   label: '📖 Tutoriales' },
  { value: 'herramientas', label: '🛠️ Herramientas' },
  { value: 'certificados', label: '📜 Certificados' },
  { value: 'misc',         label: '📦 Misc' },
];

interface Props {
  defaultBrand?: string;
  defaultCategory?: string;
  defaultQ?: string;
  availableBrands: string[];
  availableCategories: string[];
}

export function HeroSearch({
  defaultBrand,
  defaultCategory,
  defaultQ,
  availableBrands,
  availableCategories,
}: Props) {
  const router = useRouter();
  const [brand,    setBrand]    = useState(defaultBrand    ?? 'Todas');
  const [category, setCategory] = useState(defaultCategory ?? 'Todas');
  const [q,        setQ]        = useState(defaultQ        ?? '');

  const visibleBrands = BRAND_META.filter(
    b => availableBrands.some(ab => ab.toLowerCase() === b.name.toLowerCase()),
  );
  const visibleCategories = CATEGORIES.filter(
    c => c.value === 'Todas' || availableCategories.includes(c.value),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (brand    !== 'Todas') params.set('brand',    brand);
    if (category !== 'Todas') params.set('category', category);
    router.push(`/archivos?${params.toString()}`);
  }

  function selectBrand(name: string) {
    setBrand(prev => prev === name ? 'Todas' : name);
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 mb-6 shadow-sm">
      {/* Título interno */}
      <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-muted)] mb-4">
        Selecciona la marca
      </p>

      {/* Chips de marca */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setBrand('Todas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            brand === 'Todas'
              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
              : 'border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
          }`}
        >
          📱 Todas
        </button>

        {visibleBrands.map(b => (
          <button
            key={b.name}
            type="button"
            onClick={() => selectBrand(b.name)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              brand === b.name
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
                : 'border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
            }`}
          >
            {b.emoji} {b.name}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--color-border)] mb-5" />

      {/* Fila de búsqueda */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
        {/* Input modelo / query */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none text-[var(--color-muted)]">
            🔍
          </span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={brand !== 'Todas' ? `Busca en ${brand}…` : 'Modelo, firmware, FRP, número de parte…'}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Selector de categoría */}
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors min-w-[170px]"
        >
          {visibleCategories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* Botón */}
        <button
          type="submit"
          className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-7 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
        >
          Buscar
        </button>
      </form>

      {/* Filtros activos */}
      {(brand !== 'Todas' || category !== 'Todas' || q) && (
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-[var(--color-muted)]">Filtros activos:</span>
          {brand !== 'Todas' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2.5 py-0.5 text-xs font-medium">
              {BRAND_META.find(b => b.name === brand)?.emoji} {brand}
              <button type="button" onClick={() => setBrand('Todas')} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
            </span>
          )}
          {category !== 'Todas' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2.5 py-0.5 text-xs font-medium">
              {CATEGORIES.find(c => c.value === category)?.label}
              <button type="button" onClick={() => setCategory('Todas')} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
            </span>
          )}
          {q && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2.5 py-0.5 text-xs font-medium">
              &ldquo;{q}&rdquo;
              <button type="button" onClick={() => setQ('')} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
            </span>
          )}
          <button
            type="button"
            onClick={() => { setBrand('Todas'); setCategory('Todas'); setQ(''); router.push('/archivos'); }}
            className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors ml-1"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
}
