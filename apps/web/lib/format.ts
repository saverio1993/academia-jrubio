export function money(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency }).format(cents / 100);
}

export function dateShort(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function bytes(n: bigint | number | null | undefined) {
  if (n == null) return '—';
  const v = typeof n === 'bigint' ? Number(n) : n;
  if (v === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(v) / Math.log(k));
  return `${(v / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function daysLeft(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
