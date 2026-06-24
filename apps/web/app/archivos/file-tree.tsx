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

// ── Construir árbol desde storageKey (espeja estructura de Nextcloud) ─────────
interface SubfolderNode {
  name: string;       // e.g. "HONOR 200" o "DUMP SAMSUNG"
  fullPath: string;   // e.g. "HONOR/HONOR 200"
  files: FileItem[];
}
interface BrandNode {
  name: string;
  directFiles: FileItem[];            // archivos directamente en la carpeta de marca
  subfolders: Map<string, SubfolderNode>;
}

function buildTree(files: FileItem[]): BrandNode[] {
  const map = new Map<string, BrandNode>();

  for (const f of files) {
    const parts  = f.storageKey.split('/');
    const brand  = parts[0] || f.brand || 'Otros';

    if (!map.has(brand)) map.set(brand, { name: brand, directFiles: [], subfolders: new Map() });
    const brandNode = map.get(brand)!;

    if (parts.length <= 2) {
      // Archivo directamente bajo la carpeta de marca
      brandNode.directFiles.push(f);
    } else {
      // Subcarpeta(s): unir las partes intermedias como nombre visible
      const subPath  = parts.slice(1, -1).join('/');
      const subLabel = parts.slice(1, -1).join(' / ');
      if (!brandNode.subfolders.has(subPath)) {
        brandNode.subfolders.set(subPath, { name: subLabel, fullPath: `${brand}/${subPath}`, files: [] });
      }
      brandNode.subfolders.get(subPath)!.files.push(f);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((bn) => ({
      ...bn,
      directFiles: bn.directFiles.sort((a, b) => a.title.localeCompare(b.title)),
      subfolders: new Map(
        Array.from(bn.subfolders.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([k, v]) => [k, { ...v, files: v.files.sort((a, b) => a.title.localeCompare(b.title)) }]),
      ),
    }));
}

type ContextMenu = {
  x: number; y: number;
  kind: 'file' | 'folder';
  file?: FileItem;
  folderPath?: string;
  folderLabel?: string;
  fileCount?: number;
} | null;

export function FileTree({ files, hasSub, userId }: { files: FileItem[]; hasSub: boolean; userId: string }) {
  const tree = useMemo(() => buildTree(files), [files]);

  const [openBrands,    setOpenBrands]    = useState<Set<string>>(new Set());
  const [openSubfolder, setOpenSubfolder] = useState<Set<string>>(new Set());
  const [showAll,       setShowAll]       = useState<Set<string>>(new Set());
  const [menu,          setMenu]          = useState<ContextMenu>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', () => setMenu(null), true);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  };

  if (tree.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center text-sm text-[var(--color-muted)]">
        No hay archivos para mostrar.
      </div>
    );
  }

  return (
    <div className="relative space-y-2">
      <p className="text-xs text-[var(--color-muted)] mb-2">
        💡 Click para abrir · Click derecho para más opciones
      </p>

      {tree.map((brandNode) => {
        const brandOpen  = openBrands.has(brandNode.name);
        const totalFiles = brandNode.directFiles.length +
          Array.from(brandNode.subfolders.values()).reduce((s, sf) => s + sf.files.length, 0);

        return (
          <div key={brandNode.name} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            {/* ── Marca ───────────────────────────────────────────────────── */}
            <button
              onClick={() => setOpenBrands(toggle(openBrands, brandNode.name))}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-muted)] text-xs w-3">{brandOpen ? '▾' : '▸'}</span>
                <span className="text-base">📦</span>
                <span className="font-semibold text-sm">{brandNode.name}</span>
              </div>
              <span className="text-xs text-[var(--color-muted)]">{totalFiles} archivos</span>
            </button>

            {brandOpen && (
              <div className="border-t border-[var(--color-border)]">
                {/* Archivos directos en la carpeta de marca */}
                {brandNode.directFiles.map((f) => {
                  const blocked = f.isPremium && !hasSub;
                  return (
                    <div
                      key={f.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu({ x: e.clientX, y: e.clientY, kind: 'file', file: f });
                      }}
                      className={`flex items-center justify-between gap-3 pl-10 pr-4 py-1.5 hover:bg-white/[0.04] ${blocked ? 'opacity-60' : ''}`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="text-xs">📄</span>
                        <span className="text-xs text-[var(--color-fg)] truncate">{f.title}</span>
                        {f.isPremium && (
                          <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-accent)]">PRO</span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[10px] text-[var(--color-muted)] hidden sm:inline">{f.sizeBytes ? bytes(f.sizeBytes) : ''}</span>
                        <DownloadButton fileId={f.id} storageKey={f.storageKey} blocked={blocked} userId={userId} />
                      </div>
                    </div>
                  );
                })}

                {/* ── Subcarpetas ─────────────────────────────────────────── */}
                {Array.from(brandNode.subfolders.values()).map((sf) => {
                  const sfKey  = sf.fullPath;
                  const sfOpen = openSubfolder.has(sfKey);
                  const limit  = showAll.has(sfKey) ? sf.files.length : 30;

                  return (
                    <div key={sfKey}>
                      {/* Fila de subcarpeta */}
                      <div className="flex items-center pl-9 pr-4 py-2 hover:bg-white/[0.03] group">
                        <button
                          onClick={() => setOpenSubfolder(toggle(openSubfolder, sfKey))}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setMenu({ x: e.clientX, y: e.clientY, kind: 'folder', folderPath: sf.fullPath, folderLabel: sf.name, fileCount: sf.files.length });
                          }}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                        >
                          <span className="text-[var(--color-muted)] text-xs w-3">{sfOpen ? '▾' : '▸'}</span>
                          <span>📁</span>
                          <span className="text-sm truncate">{sf.name}</span>
                          <span className="text-xs text-[var(--color-muted)] ml-1">({sf.files.length})</span>
                        </button>
                        <DownloadFolderButton folderPath={sf.fullPath} label="⬇ ZIP" />
                      </div>

                      {/* Archivos dentro de la subcarpeta */}
                      {sfOpen && (
                        <div className="bg-black/20">
                          {sf.files.slice(0, limit).map((f) => {
                            const blocked = f.isPremium && !hasSub;
                            return (
                              <div
                                key={f.id}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setMenu({ x: e.clientX, y: e.clientY, kind: 'file', file: f });
                                }}
                                className={`flex items-center justify-between gap-3 pl-16 pr-4 py-1.5 hover:bg-white/[0.04] ${blocked ? 'opacity-60' : ''}`}
                              >
                                <div className="min-w-0 flex-1 flex items-center gap-2">
                                  <span className="text-xs">📄</span>
                                  <span className="text-xs text-[var(--color-fg)] truncate">{f.title}</span>
                                  {f.isPremium && (
                                    <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-accent)]">PRO</span>
                                  )}
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  <span className="text-[10px] text-[var(--color-muted)] hidden sm:inline">{f.sizeBytes ? bytes(f.sizeBytes) : ''}</span>
                                  <DownloadButton fileId={f.id} storageKey={f.storageKey} blocked={blocked} userId={userId} />
                                </div>
                              </div>
                            );
                          })}
                          {sf.files.length > 30 && (
                            <button
                              onClick={() => setShowAll(toggle(showAll, sfKey))}
                              className="block w-full text-left pl-16 pr-4 py-1.5 text-xs text-[var(--color-accent)] hover:bg-white/[0.03]"
                            >
                              {showAll.has(sfKey) ? '▲ Ver menos' : `▼ Ver ${sf.files.length - 30} más`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Menú contextual */}
      {menu && (
        <div
          ref={menuRef}
          style={{ top: menu.y, left: menu.x }}
          className="fixed z-50 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl py-1 text-sm"
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
              label={`⬇ Descargar carpeta (${menu.fileCount})`}
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
