'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { DownloadButton } from './download-button';
import { DownloadFolderButton } from './download-folder-button';
import { FavoriteButton } from './favorite-button';
import { ReportButton } from './report-button';
import { bytes } from '@/lib/format';

interface FileItem {
  id: string;
  title: string;
  brand: string;
  model: string | null;
  category: string;
  subcategory: string | null;
  storageKey: string;
  sizeBytes: bigint | null;
  isPremium: boolean;
  downloadsCount: number;
  createdAt: Date;
}

// ── Árbol recursivo ──────────────────────────────────────────────────────────
interface TreeNode {
  name: string;
  fullPath: string;
  storagePath: string;
  files: FileItem[];
  children: Map<string, TreeNode>;
}

function newNode(name: string, fullPath: string, storagePath: string): TreeNode {
  return { name, fullPath, storagePath, files: [], children: new Map() };
}

const STORAGE_PREFIX = 'files';

function buildTree(files: FileItem[]): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();
  for (const f of files) {
    const rawParts = f.storageKey.split('/').filter(Boolean);
    const parts    = rawParts[0] === STORAGE_PREFIX ? rawParts.slice(1) : rawParts;
    if (parts.length === 0) continue;

    const mkStoragePath = (displayParts: string[]) =>
      rawParts[0] === STORAGE_PREFIX
        ? `${STORAGE_PREFIX}/${displayParts.join('/')}`
        : displayParts.join('/');

    const topSeg = parts[0]!;
    if (!root.has(topSeg)) root.set(topSeg, newNode(topSeg, topSeg, mkStoragePath([topSeg])));
    let node = root.get(topSeg)!;

    for (let i = 1; i < parts.length - 1; i++) {
      const seg = parts[i]!;
      if (!node.children.has(seg)) {
        node.children.set(seg, newNode(seg, parts.slice(0, i + 1).join('/'), mkStoragePath(parts.slice(0, i + 1))));
      }
      node = node.children.get(seg)!;
    }
    node.files.push(f);
  }
  return root;
}

function totalFiles(node: TreeNode): number {
  let n = node.files.length;
  for (const c of node.children.values()) n += totalFiles(c);
  return n;
}

// ── Colores y emojis por marca ───────────────────────────────────────────────
const BRAND_PALETTE: Record<string, { dot: string; from: string }> = {
  samsung:    { dot: '#3b82f6', from: 'rgba(59,130,246,0.10)' },
  honor:      { dot: '#f59e0b', from: 'rgba(245,158,11,0.10)'  },
  huawei:     { dot: '#06b6d4', from: 'rgba(6,182,212,0.10)'  },
  xiaomi:     { dot: '#f97316', from: 'rgba(249,115,22,0.10)' },
  motorola:   { dot: '#6366f1', from: 'rgba(99,102,241,0.10)' },
  oppo:       { dot: '#22c55e', from: 'rgba(34,197,94,0.10)'  },
  vivo:       { dot: '#a855f7', from: 'rgba(168,85,247,0.10)' },
  tecno:      { dot: '#fbbf24', from: 'rgba(251,191,36,0.10)' },
  infinix:    { dot: '#14b8a6', from: 'rgba(20,184,166,0.10)' },
  realme:     { dot: '#f59e0b', from: 'rgba(245,158,11,0.10)' },
  lg:         { dot: '#0ea5e9', from: 'rgba(14,165,233,0.10)' },
  itel:       { dot: '#ec4899', from: 'rgba(236,72,153,0.10)' },
  drivers:    { dot: '#8b5cf6', from: 'rgba(139,92,246,0.10)' },
  herramientas: { dot: '#6b7280', from: 'rgba(107,114,128,0.10)' },
};

const BRAND_EMOJI: Record<string, string> = {
  samsung: '🌀', xiaomi: '🔶', motorola: '〽️', huawei: '🌸',
  honor: '🏅', oppo: '🔷', vivo: '🎵', tecno: '🔆', infinix: '⚡',
  lg: '🔵', realme: '📱', itel: '📲', drivers: '🔧', herramientas: '🛠️',
};

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};
const CAT_COLOR: Record<string, string> = {
  firmware:     '#3b82f6',
  frp:          '#f97316',
  root:         '#eab308',
  drivers:      '#8b5cf6',
  unlock:       '#22c55e',
  dump:         '#6b7280',
  tutoriales:   '#ec4899',
  herramientas: '#14b8a6',
};

function brandPalette(name: string) {
  return BRAND_PALETTE[name.toLowerCase()] ?? { dot: '#6b7280', from: 'rgba(107,114,128,0.08)' };
}
function brandEmoji(name: string) {
  return BRAND_EMOJI[name.toLowerCase()] ?? '📱';
}
function catColor(cat: string) {
  return CAT_COLOR[cat.toLowerCase()] ?? '#6b7280';
}

// ── Menú contextual ──────────────────────────────────────────────────────────
type ContextMenu = {
  x: number; y: number;
  kind: 'file' | 'folder';
  file?: FileItem;
  folderPath?: string;
  fileCount?: number;
} | null;

// ── Fila de archivo ──────────────────────────────────────────────────────────
function FileRow({
  f,
  indent,
  hasSub,
  userId,
  favSet,
  onMenu,
  dotColor,
}: {
  f: FileItem;
  indent: number;
  hasSub: boolean;
  userId: string;
  favSet: Set<string>;
  onMenu: (m: ContextMenu) => void;
  dotColor: string;
}) {
  const blocked = f.isPremium && !hasSub;
  const icon    = CAT_ICON[f.category] ?? '📄';
  const cc      = catColor(f.category);

  return (
    <div
      onContextMenu={e => { e.preventDefault(); onMenu({ x: e.clientX, y: e.clientY, kind: 'file', file: f }); }}
      style={{ paddingLeft: `${indent}px` }}
      className={`flex items-center gap-2.5 pr-3 py-2 hover:bg-white/[0.04] transition-colors border-b border-[var(--color-border)]/30 last:border-b-0 ${blocked ? 'opacity-55' : ''}`}
    >
      {/* Accent line */}
      <div className="w-px self-stretch shrink-0" style={{ background: `${dotColor}40` }} />

      {/* Category icon */}
      <div
        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px]"
        style={{ background: `${cc}18`, border: `1px solid ${cc}30`, color: cc }}
        title={f.category}
      >
        {icon}
      </div>

      {/* Title + badges */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] text-[var(--color-fg)] truncate max-w-[220px] sm:max-w-none">
            {f.title}
          </span>
          {f.isPremium && (
            <span
              className="shrink-0 rounded-full px-1.5 py-px text-[8px] font-black uppercase tracking-wide"
              style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--color-accent)', border: '1px solid rgba(249,115,22,0.3)' }}
            >
              PRO
            </span>
          )}
        </div>
        <p className="text-[10px] text-[var(--color-muted)] mt-0.5 flex items-center gap-1.5">
          {f.sizeBytes ? <span>{bytes(f.sizeBytes)}</span> : null}
          {f.sizeBytes && f.downloadsCount > 0 && <span>·</span>}
          {f.downloadsCount > 0 && <span>↓{f.downloadsCount}</span>}
        </p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1">
        <FavoriteButton fileItemId={f.id} initialFav={favSet.has(f.id)} />
        <ReportButton fileItemId={f.id} fileTitle={f.title} />
        <DownloadButton fileId={f.id} storageKey={f.storageKey} blocked={blocked} userId={userId} label={blocked ? 'PRO' : 'Descargar'} />
      </div>
    </div>
  );
}

// ── Nodo de carpeta ──────────────────────────────────────────────────────────
function FolderNode({
  node,
  depth,
  hasSub,
  userId,
  favSet,
  onMenu,
  dotColor,
}: {
  node: TreeNode;
  depth: number;
  hasSub: boolean;
  userId: string;
  favSet: Set<string>;
  onMenu: (m: ContextMenu) => void;
  dotColor: string;
}) {
  const [open, setOpen]       = useState(false);
  const [showAll, setShowAll] = useState(false);
  const total = totalFiles(node);

  const sortedChildren = useMemo(
    () => Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node],
  );
  const sortedFiles  = useMemo(() => [...node.files].sort((a, b) => a.title.localeCompare(b.title)), [node]);
  const visibleFiles = showAll ? sortedFiles : sortedFiles.slice(0, 30);

  const indent = depth * 20;

  return (
    <div>
      {/* Folder row */}
      <div className="flex items-center group hover:bg-white/[0.03] transition-colors">
        <button
          onClick={() => setOpen(v => !v)}
          onContextMenu={e => {
            e.preventDefault();
            onMenu({ x: e.clientX, y: e.clientY, kind: 'folder', folderPath: node.storagePath, fileCount: total });
          }}
          style={{ paddingLeft: `${20 + indent}px` }}
          className="flex-1 flex items-center gap-2 py-2 pr-2 text-left min-w-0"
        >
          {/* vertical guide line */}
          <div className="w-3 h-px shrink-0" style={{ background: `${dotColor}50` }} />
          <span className="shrink-0" style={{ color: `${dotColor}90`, fontSize: 11 }}>{open ? '▾' : '▸'}</span>
          <span className="shrink-0">{open ? '📂' : '📁'}</span>
          <span className="text-[13px] font-medium truncate">{node.name}</span>
          <span
            className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold"
            style={{ background: `${dotColor}15`, color: dotColor }}
          >
            {total}
          </span>
        </button>
        {/* ZIP button on hover */}
        <div className="shrink-0 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <DownloadFolderButton folderPath={node.storagePath} label="⬇ ZIP" />
        </div>
      </div>

      {/* Children */}
      {open && (
        <div>
          {sortedChildren.map(child => (
            <FolderNode
              key={child.name}
              node={child}
              depth={depth + 1}
              hasSub={hasSub}
              userId={userId}
              favSet={favSet}
              onMenu={onMenu}
              dotColor={dotColor}
            />
          ))}
          {visibleFiles.map(f => (
            <FileRow
              key={f.id}
              f={f}
              indent={28 + indent}
              hasSub={hasSub}
              userId={userId}
              favSet={favSet}
              onMenu={onMenu}
              dotColor={dotColor}
            />
          ))}
          {sortedFiles.length > 30 && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ paddingLeft: `${40 + indent}px` }}
              className="block w-full text-left pr-4 py-1.5 text-xs hover:bg-white/[0.03] transition-colors"
            >
              <span style={{ color: dotColor }}>
                {showAll ? '▲ Ver menos' : `▼ Ver ${sortedFiles.length - 30} más`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de marca (nivel 0) ───────────────────────────────────────────────
function BrandCard({
  node,
  hasSub,
  userId,
  favSet,
  onMenu,
}: {
  node: TreeNode;
  hasSub: boolean;
  userId: string;
  favSet: Set<string>;
  onMenu: (m: ContextMenu) => void;
}) {
  const [open, setOpen] = useState(false);
  const total = totalFiles(node);
  const pal   = brandPalette(node.name);

  const sortedChildren = useMemo(
    () => Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node],
  );
  const [showAll, setShowAll] = useState(false);
  const sortedFiles  = useMemo(() => [...node.files].sort((a, b) => a.title.localeCompare(b.title)), [node]);
  const visibleFiles = showAll ? sortedFiles : sortedFiles.slice(0, 30);

  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: 'var(--color-card)',
        borderColor: hovered ? `${pal.dot}60` : 'var(--color-border)',
        boxShadow: hovered ? `0 0 24px ${pal.dot}18, 0 4px 16px rgba(0,0,0,0.3)` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
      }}
    >
      {/* ── Brand header ── */}
      <button
        onClick={() => setOpen(v => !v)}
        onContextMenu={e => {
          e.preventDefault();
          onMenu({ x: e.clientX, y: e.clientY, kind: 'folder', folderPath: node.storagePath, fileCount: total });
        }}
        className="w-full flex items-center gap-3 px-3 py-3 sm:px-5 sm:py-4 text-left"
        style={{
          background: hovered
            ? `linear-gradient(135deg, ${pal.dot}18 0%, transparent 65%)`
            : `linear-gradient(135deg, ${pal.from} 0%, transparent 70%)`,
          transition: 'background 0.2s',
        }}
      >
        {/* Brand icon */}
        <div
          className="shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl sm:text-2xl"
          style={{
            background: hovered ? `${pal.dot}25` : `${pal.dot}15`,
            border: `1px solid ${hovered ? pal.dot + '60' : pal.dot + '35'}`,
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          {brandEmoji(node.name)}
        </div>

        {/* Name + count */}
        <div className="flex-1 min-w-0 text-left">
          <p
            className="font-black text-sm uppercase tracking-widest transition-colors duration-200"
            style={{ color: hovered ? pal.dot : 'var(--color-fg)' }}
          >
            {node.name}
          </p>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
            {total} archivo{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Category count pills */}
        {sortedChildren.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end max-w-[240px]">
            {sortedChildren.slice(0, 4).map(c => (
              <span
                key={c.name}
                className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                style={{ background: `${pal.dot}15`, color: pal.dot, border: `1px solid ${pal.dot}25` }}
              >
                {c.name} ({totalFiles(c)})
              </span>
            ))}
            {sortedChildren.length > 4 && (
              <span className="text-[10px] text-[var(--color-muted)]">+{sortedChildren.length - 4}</span>
            )}
          </div>
        )}

        {/* Chevron */}
        <span
          className="shrink-0 text-lg text-[var(--color-muted)] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ›
        </span>
      </button>

      {/* ── Expanded content ── */}
      {open && (
        <div className="border-t border-[var(--color-border)]">
          {sortedChildren.map(child => (
            <FolderNode
              key={child.name}
              node={child}
              depth={0}
              hasSub={hasSub}
              userId={userId}
              favSet={favSet}
              onMenu={onMenu}
              dotColor={pal.dot}
            />
          ))}
          {visibleFiles.map(f => (
            <FileRow
              key={f.id}
              f={f}
              indent={16}
              hasSub={hasSub}
              userId={userId}
              favSet={favSet}
              onMenu={onMenu}
              dotColor={pal.dot}
            />
          ))}
          {sortedFiles.length > 30 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="block w-full text-left pl-10 pr-4 py-2 text-xs transition-colors hover:bg-white/[0.03]"
            >
              <span style={{ color: pal.dot }}>
                {showAll ? '▲ Ver menos' : `▼ Ver ${sortedFiles.length - 30} más`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export function FileTree({ files, hasSub, userId, favIds }: {
  files: FileItem[];
  hasSub: boolean;
  userId: string;
  favIds: string[];
}) {
  const favSet = useMemo(() => new Set(favIds), [favIds]);

  const brandNodes = useMemo(() => {
    const tree = buildTree(files);
    return Array.from(tree.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [files]);

  const [menu, setMenu] = useState<ContextMenu>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onScroll = () => setMenu(null);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  if (brandNodes.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-16 text-center">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-[var(--color-muted)] text-sm">No hay archivos en la biblioteca todavía.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hint */}
      <p className="text-[11px] text-[var(--color-muted)] mb-3 flex items-center gap-1.5">
        <span>💡</span>
        <span>Clic para expandir · clic derecho para opciones de carpeta/archivo</span>
      </p>

      <div className="space-y-2">
        {brandNodes.map(brandNode => (
          <BrandCard
            key={brandNode.name}
            node={brandNode}
            hasSub={hasSub}
            userId={userId}
            favSet={favSet}
            onMenu={setMenu}
          />
        ))}
      </div>

      {/* Menú contextual */}
      {menu && (
        <div
          ref={menuRef}
          style={{ top: menu.y, left: menu.x, position: 'fixed' }}
          className="z-50 min-w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl py-1.5 text-sm overflow-hidden"
        >
          {menu.kind === 'file' && menu.file && (
            <DownloadButton
              fileId={menu.file.id}
              storageKey={menu.file.storageKey}
              blocked={menu.file.isPremium && !hasSub}
              userId={userId}
              asMenuItem
              label="⬇ Descargar archivo"
            />
          )}
          {menu.kind === 'folder' && menu.folderPath && (
            <DownloadFolderButton
              folderPath={menu.folderPath}
              label={`⬇ Descargar ZIP (${menu.fileCount} archivos)`}
              asMenuItem
            />
          )}
          <button
            onClick={() => setMenu(null)}
            className="w-full text-left px-3 py-2 text-xs text-[var(--color-muted)] hover:bg-white/5 border-t border-[var(--color-border)] mt-1 pt-2"
          >
            ✕ Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
