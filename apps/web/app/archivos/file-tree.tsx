'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { DownloadButton } from './download-button';
import { DownloadFolderButton } from './download-folder-button';
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
  createdAt: Date;
}

// ── Árbol recursivo — espeja la estructura exacta de Nextcloud ──────────────
interface TreeNode {
  name: string;
  fullPath: string;    // ruta de display (sin prefijo "files/")
  storagePath: string; // ruta real relativa en Nextcloud (con "files/" si aplica)
  files: FileItem[];
  children: Map<string, TreeNode>;
}

function newNode(name: string, fullPath: string, storagePath: string): TreeNode {
  return { name, fullPath, storagePath, files: [], children: new Map() };
}

// Segmento raíz a ignorar en la visualización (es la carpeta "files" de Nextcloud)
const STORAGE_PREFIX = 'files';

function buildTree(files: FileItem[]): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();

  for (const f of files) {
    const rawParts = f.storageKey.split('/').filter(Boolean);
    // Si el storageKey empieza con "files/", quitarlo para la visualización
    const parts = rawParts[0] === STORAGE_PREFIX ? rawParts.slice(1) : rawParts;
    if (parts.length === 0) continue;

    const mkStoragePath = (displayParts: string[]) =>
      rawParts[0] === STORAGE_PREFIX
        ? `${STORAGE_PREFIX}/${displayParts.join('/')}`
        : displayParts.join('/');

    // ─ Nivel 0: primera carpeta real (marca / tipo) ─
    const topSeg = parts[0]!;
    if (!root.has(topSeg)) {
      root.set(topSeg, newNode(topSeg, topSeg, mkStoragePath([topSeg])));
    }
    let node = root.get(topSeg)!;

    // ─ Niveles intermedios ─
    for (let i = 1; i < parts.length - 1; i++) {
      const seg = parts[i]!;
      if (!node.children.has(seg)) {
        const displayPath  = parts.slice(0, i + 1).join('/');
        const storagePath  = mkStoragePath(parts.slice(0, i + 1));
        node.children.set(seg, newNode(seg, displayPath, storagePath));
      }
      node = node.children.get(seg)!;
    }

    // ─ Archivo en el nodo destino ─
    node.files.push(f);
  }

  return root;
}

function totalFiles(node: TreeNode): number {
  let n = node.files.length;
  for (const c of node.children.values()) n += totalFiles(c);
  return n;
}

// ── Menú contextual ─────────────────────────────────────────────────────────
type ContextMenu = {
  x: number; y: number;
  kind: 'file' | 'folder';
  file?: FileItem;
  folderPath?: string;
  fileCount?: number;
} | null;

// ── Nodo recursivo ──────────────────────────────────────────────────────────
function FolderNode({
  node,
  depth,
  hasSub,
  userId,
  onMenu,
}: {
  node: TreeNode;
  depth: number;
  hasSub: boolean;
  userId: string;
  onMenu: (m: ContextMenu) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const total = totalFiles(node);

  const sortedChildren = useMemo(
    () => Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node],
  );
  const sortedFiles = useMemo(
    () => [...node.files].sort((a, b) => a.title.localeCompare(b.title)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node],
  );
  const visibleFiles = showAll ? sortedFiles : sortedFiles.slice(0, 30);

  const indent = 10 + depth * 18; // px de indentación izquierda

  const folderIcon = depth === 0 ? '📦' : open ? '📂' : '📁';
  const fontWeight  = depth === 0 ? 'font-semibold' : 'font-medium';
  const fontSize    = depth === 0 ? 'text-sm' : 'text-[13px]';

  return (
    <div>
      {/* ── Fila de carpeta ── */}
      <div className="flex items-center group hover:bg-white/[0.03] transition-colors">
        <button
          onClick={() => setOpen(v => !v)}
          onContextMenu={e => {
            e.preventDefault();
            onMenu({ x: e.clientX, y: e.clientY, kind: 'folder', folderPath: node.storagePath, fileCount: total });
          }}
          style={{ paddingLeft: `${indent}px` }}
          className="flex-1 flex items-center gap-2 py-2 pr-2 text-left min-w-0"
        >
          <span className="text-[var(--color-muted)] text-[10px] w-2.5 shrink-0">{open ? '▾' : '▸'}</span>
          <span className="shrink-0">{folderIcon}</span>
          <span className={`${fontWeight} ${fontSize} truncate`}>{node.name}</span>
          <span className="text-[11px] text-[var(--color-muted)] shrink-0">({total})</span>
        </button>

        {/* Botón ZIP solo en subcarpetas (no en la marca raíz) */}
        {depth > 0 && (
          <div className="shrink-0 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <DownloadFolderButton folderPath={node.storagePath} label="⬇ ZIP" />
          </div>
        )}
      </div>

      {/* ── Contenido expandido ── */}
      {open && (
        <div>
          {/* Subcarpetas primero */}
          {sortedChildren.map(child => (
            <FolderNode
              key={child.name}
              node={child}
              depth={depth + 1}
              hasSub={hasSub}
              userId={userId}
              onMenu={onMenu}
            />
          ))}

          {/* Archivos directos en este nodo */}
          {visibleFiles.map(f => {
            const blocked = f.isPremium && !hasSub;
            return (
              <div
                key={f.id}
                onContextMenu={e => {
                  e.preventDefault();
                  onMenu({ x: e.clientX, y: e.clientY, kind: 'file', file: f });
                }}
                style={{ paddingLeft: `${indent + 26}px` }}
                className={`flex items-center justify-between gap-3 pr-4 py-1.5 hover:bg-white/[0.04] transition-colors ${blocked ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="text-xs shrink-0">📄</span>
                  <span className="text-[12px] text-[var(--color-fg)] truncate">{f.title}</span>
                  {f.isPremium && (
                    <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">
                      PRO
                    </span>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-muted)] hidden sm:inline">
                    {f.sizeBytes ? bytes(f.sizeBytes) : ''}
                  </span>
                  <DownloadButton fileId={f.id} storageKey={f.storageKey} blocked={blocked} userId={userId} label={blocked ? 'PRO' : 'Descargar'} />
                </div>
              </div>
            );
          })}

          {/* Botón "Ver más" cuando hay muchos archivos */}
          {sortedFiles.length > 30 && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ paddingLeft: `${indent + 26}px` }}
              className="block w-full text-left pr-4 py-1.5 text-xs text-[var(--color-accent)] hover:bg-white/[0.03]"
            >
              {showAll ? '▲ Ver menos' : `▼ Ver ${sortedFiles.length - 30} más`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export function FileTree({ files, hasSub, userId }: { files: FileItem[]; hasSub: boolean; userId: string }) {
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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center text-sm text-[var(--color-muted)]">
        No hay archivos para mostrar.
      </div>
    );
  }

  return (
    <div className="relative space-y-2">
      <p className="text-xs text-[var(--color-muted)] mb-2">
        💡 Click para abrir/cerrar · Click derecho para opciones
      </p>

      {brandNodes.map(brandNode => (
        <div
          key={brandNode.name}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
        >
          <FolderNode
            node={brandNode}
            depth={0}
            hasSub={hasSub}
            userId={userId}
            onMenu={setMenu}
          />
        </div>
      ))}

      {/* ── Menú contextual ── */}
      {menu && (
        <div
          ref={menuRef}
          style={{ top: menu.y, left: menu.x, position: 'fixed' }}
          className="z-50 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl py-1 text-sm"
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
            className="w-full text-left px-3 py-2 text-xs text-[var(--color-muted)] hover:bg-white/5 border-t border-[var(--color-border)]"
          >
            ✕ Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
