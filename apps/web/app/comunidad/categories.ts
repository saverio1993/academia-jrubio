export const CATEGORIES = {
  frp:          { label: 'FRP / Google',  emoji: '🔓', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.30)' },
  imei:         { label: 'IMEI / Unlock', emoji: '📡', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.30)' },
  flash:        { label: 'Flashing',      emoji: '💾', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.30)' },
  unlock:       { label: 'Desbloqueo',    emoji: '🔑', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.30)'  },
  herramientas: { label: 'Herramientas',  emoji: '🛠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)' },
  general:      { label: 'General',       emoji: '💬', color: '#6b7280', bg: 'rgba(107,114,128,0.12)',border: 'rgba(107,114,128,0.30)' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export function getCategory(key: string) {
  return CATEGORIES[key as CategoryKey] ?? CATEGORIES.general;
}

export function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days}d`;
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function initials(name: string | null, email: string | null): string {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@]+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] ?? '') + (parts[1]![0] ?? '')).toUpperCase();
}
