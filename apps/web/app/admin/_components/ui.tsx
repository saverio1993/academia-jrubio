import type { ReactNode } from 'react';

/* ---------- Card ---------- */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- StatCard ---------- */
export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${accent ? 'text-[var(--color-accent)]' : ''}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
    </Card>
  );
}

/* ---------- Section header ---------- */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
const BADGE_STYLES: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gray: 'bg-white/5 text-[var(--color-muted)] border-[var(--color-border)]',
  orange: 'bg-orange-500/10 text-[var(--color-accent)] border-orange-500/20',
};

export function Badge({ color = 'gray', children }: { color?: keyof typeof BADGE_STYLES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[color]}`}
    >
      {children}
    </span>
  );
}

/* ---------- Table primitives ---------- */
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wider text-[var(--color-muted)]">
              {head}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

/* ---------- Empty state ---------- */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-muted)]">
      {children}
    </div>
  );
}

/* ---------- Buttons (presentational classes) ---------- */
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10';
export const btnApprove =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/10';
export const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-accent)]';

/* ---------- Field (input/select/textarea wrapper) ---------- */
export function Field({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required = false,
  min,
  max,
  step,
  rows = 3,
  options,
}: {
  name: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'email' | 'url' | 'select' | 'textarea';
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--color-muted)]">{label}</span>
      {type === 'select' ? (
        <select name={name} defaultValue={defaultValue} className={inputCls} required={required}>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={inputCls}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          className={inputCls}
        />
      )}
    </label>
  );
}
