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

interface ModelNode {
  name: string;
  files: FileItem[];
}
interface FolderNode {
  name: string;
  models: Map<string, ModelNode>;
}
interface BrandNode {
  brand: string;
  folders: Map<string, FolderNode>;
}

function buildTree(files: FileItem[]): BrandNode[] {
  const grouped = new Map<string, Map<string, Map<string, FileItem[]>>>();
  for (const f of files) {
    const brand = f.brand || 'Otros';
    const folder = f.subcategory || 'Sin carpeta';
    const model = f.model || folder;
    if (!grouped.has(brand)) grouped.set(brand, new Map());
    if (!grouped.get(brand)!.has(folder)) grouped.get(brand)!.set(folder, new Map());
    if (!grouped.get(brand)!.get(folder)!.has(model)) grouped.get(brand)!.get(folder)!.set(model, []);
    grouped.get(brand)!.get(folder)!.get(model)!.push(f);
  }
  const out: BrandNode[] = [];
  for (const [brand, fm] of Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const bn: BrandNode = { brand, folders: new Map() };
    for (const [folder, mm] of Array.from(fm.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const fn: FolderNode = { name: folder, models: new Map() };
      for (const [model, fl] of Array.from(mm.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        fn.models.set(model, { name: model, files: fl.sort((a, b) => a.title.localeCompare(b.title)) });
      }
      bn.folders.set(folder, fn);
    }
    out.push(bn);
  }
  return out;
}

type ContextMenu = {
  x: number;
  y: number;
  kind: 'file' | 'folder' | 'model';
  file?: FileItem;
  folderPath?: string;
  folderLabel?: string;
  fileCount?: number;
} | null;

type MenuPayload =
  | { kind: 'file'; file: FileItem }
  | { kind: 'folder'; folderPath: string; folderLabel: string; fileCount: number }
  | { kind: 'model'; folderPath: string; folderLabel: string; fileCount: number };

export function FileTree({ files, hasSub, userId }: { files: FileItem[]; hasSub: boolean; userId: string }) {
  const tree = useMemo(() => buildTree(files), [files]);

  // TODOS cerrados por defecto
  const [openBrands, setOpenBrands] = useState<Set<string>>(new Set());
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [openModels, setOpenModels] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<ContextMenu>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', () => setMenu(null), true);
    return () => document.removeEventListener('mousedown', close);
  }, [menuRef]);

  const t = (set: Set<string>, k: string) => {
    const n = new Set(set);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  };

  const openMenu = (e: React.MouseEvent, payload: MenuPayload) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, ...payload });
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
      {/* Hint superior */}
      <p className="text-xs text-[var(--color-muted)] mb-2">
        💡 Click para abrir · Click derecho para más opciones
      </p>

      {tree.map((brandNode) => {
        const brandOpen = openBrands.has(brandNode.brand);
        const totalFiles = Array.from(brandNode.folders.values())
          .reduce((s, f) => s + Array.from(f.models.values()).reduce((ss, m) => ss + m.files.length, 0), 0);

        return (
          <div key={brandNode.brand} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            {/* Brand row */}
            <button
              onClick={() => setOpenBrands(t(openBrands, brandNode.brand))}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-muted)] text-xs w-3">{brandOpen ? '▾' : '▸'}</span>
                <span className="text-base">📦</span>
                <span className="font-semibold text-sm">{brandNode.brand}</span>
              </div>
              <span className="text-xs text-[var(--color-muted)]">{totalFiles} archivos</span>
            </button>

            {brandOpen && (
              <div className="border-t border-[var(--color-border)]">
                {Array.from(brandNode.folders.values()).map((folder) => {
                  const folderKey = `${brandNode.brand}/${folder.name}`;
                  const folderOpen = openFolders.has(folderKey);
                  const folderFiles = Array.from(folder.models.values()).reduce((s, m) => s + m.files.length, 0);
                  const folderPath = `/AcademiaJRubio/${folder.name}`;

                  return (
                    <div key={folderKey}>
                      {/* Folder row */}
                      <div className="flex items-center pl-9 pr-4 py-2 hover:bg-white/[0.03] group">
                        <button
                          onClick={() => setOpenFolders(t(openFolders, folderKey))}
                          onContextMenu={(e) =>
                            openMenu(e, { kind: 'folder', folderPath, folderLabel: folder.name, fileCount: folderFiles })
                          }
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                        >
                          <span className="text-[var(--color-muted)] text-xs w-3">{folderOpen ? '▾' : '▸'}</span>
                          <span>📁</span>
                          <span className="text-sm truncate">{folder.name}</span>
                          <span className="text-xs text-[var(--color-muted)] ml-1">({folderFiles})</span>
                        </button>
                        {/* Botón ZIP de carpeta a la derecha, siempre visible */}
                        <DownloadFolderButton
                          folderPath={folderPath}
                          label={`⬇ ZIP`}
                        />
                      </div>

                      {folderOpen && (
                        <div>
                          {Array.from(folder.models.values()).map((modelNode) => {
                            const modelKey = `${folderKey}/${modelNode.name}`;
                            const modelOpen = openModels.has(modelKey);
                            const modelPath = `${folderPath}${modelNode.name !== folder.name ? '/' + modelNode.name : ''}`;

                            return (
                              <div key={modelKey}>
                                {/* Model row */}
                                <div className="flex items-center pl-14 pr-4 py-1.5 hover:bg-white/[0.03] group">
                                  <button
                                    onClick={() => setOpenModels(t(openModels, modelKey))}
                                    onContextMenu={(e) =>
                                      openMenu(e, {
                                        kind: 'model',
                                        folderPath: modelPath,
                                        folderLabel: modelNode.name,
                                        fileCount: modelNode.files.length,
                                      })
                                    }
                                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                                  >
                                    <span className="text-[var(--color-muted)] text-xs w-3">{modelOpen ? '▾' : '▸'}</span>
                                    <span className="text-sm">📱</span>
                                    <span className="text-sm text-[var(--color-fg)] truncate">{modelNode.name}</span>
                                    <span className="text-xs text-[var(--color-muted)] ml-1">({modelNode.files.length})</span>
                                  </button>
                                  {/* Botón ZIP a la derecha, siempre visible */}
                                  <DownloadFolderButton
                                    folderPath={modelPath}
                                    label={`⬇ ZIP`}
                                  />
                                </div>

                                {modelOpen && (
                                  <div className="bg-black/20">
                                    {(() => {
                                      const limit = showAll.has(modelKey) ? modelNode.files.length : 20;
                                      const visible = modelNode.files.slice(0, limit);
                                      return (
                                        <>
                                          {visible.map((f) => {
                                            const blocked = f.isPremium && !hasSub;
                                            return (
                                              <div
                                                key={f.id}
                                                onContextMenu={(e) => openMenu(e, { kind: 'file', file: f })}
                                                className={`group flex items-center justify-between gap-3 pl-20 pr-4 py-1.5 hover:bg-white/[0.04] ${blocked ? 'opacity-60' : ''}`}
                                              >
                                                <div className="min-w-0 flex-1 flex items-center gap-2">
                                                  <span className="text-xs">📄</span>
                                                  <span className="text-xs text-[var(--color-fg)] truncate">{f.title}</span>
                                                  {f.isPremium && (
                                                    <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-accent)]">
                                                      PRO
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="shrink-0 flex items-center gap-2">
                                                  <span className="text-[10px] text-[var(--color-muted)] hidden sm:inline">
                                                    {f.sizeBytes ? bytes(f.sizeBytes) : ''}
                                                  </span>
                                                  <DownloadButton
                                                    fileId={f.id}
                                                    storageKey={f.storageKey}
                                                    blocked={blocked}
                                                    userId={userId}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                          {modelNode.files.length > 20 && (
                                            <button
                                              onClick={() => setShowAll(t(showAll, modelKey))}
                                              className="block w-full text-left pl-20 pr-4 py-1.5 text-xs text-[var(--color-accent)] hover:bg-white/[0.03]"
                                            >
                                              {showAll.has(modelKey) ? '▲ Ver menos' : `▼ Ver ${modelNode.files.length - 20} más`}
                                            </button>
                                          )}
                                        </>
                                      );
                                    })()}
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
              </div>
            )}
          </div>
        );
      })}

      {/* Context menu */}
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
          {(menu.kind === 'folder' || menu.kind === 'model') && menu.folderPath && (
            <DownloadFolderButton
              folderPath={menu.folderPath}
              label={`⬇ Descargar ${menu.kind === 'folder' ? 'carpeta' : 'modelo'} (${menu.fileCount})`}
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
