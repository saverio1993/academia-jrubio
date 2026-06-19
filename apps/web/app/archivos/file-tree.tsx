'use client';

import { useState, useMemo } from 'react';
import { DownloadButton } from './download-button';
import { DownloadFolderButton } from './download-folder-button';
import { bytes, dateShort } from '@/lib/format';

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

interface Tree {
  brand: string;
  folders: Map<string, FolderNode>;
}

interface FolderNode {
  name: string;
  models: Map<string, ModelNode>;
}

interface ModelNode {
  name: string;
  files: FileItem[];
}

function buildTree(files: FileItem[]): Tree[] {
  const brandMap = new Map<string, FolderNode[]>();
  // brand → folderName → modelName → files
  const grouped = new Map<string, Map<string, Map<string, FileItem[]>>>();

  for (const f of files) {
    const brand = f.brand || 'Otros';
    const folder = f.subcategory || 'Sin carpeta';
    const model = f.model || folder; // si no hay modelo, usar la carpeta

    if (!grouped.has(brand)) grouped.set(brand, new Map());
    if (!grouped.get(brand)!.has(folder)) grouped.get(brand)!.set(folder, new Map());
    if (!grouped.get(brand)!.get(folder)!.has(model)) grouped.get(brand)!.get(folder)!.set(model, []);
    grouped.get(brand)!.get(folder)!.get(model)!.push(f);
  }

  // Convertir a estructura
  const result: Tree[] = [];
  for (const [brand, foldersMap] of Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const tree: Tree = { brand, folders: new Map() };
    for (const [folder, modelsMap] of Array.from(foldersMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const folderNode: FolderNode = { name: folder, models: new Map() };
      for (const [model, fileList] of Array.from(modelsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        folderNode.models.set(model, { name: model, files: fileList.sort((a, b) => a.title.localeCompare(b.title)) });
      }
      tree.folders.set(folder, folderNode);
    }
    result.push(tree);
  }
  return result;
}

export function FileTree({ files, hasSub, userId }: { files: FileItem[]; hasSub: boolean; userId: string }) {
  const tree = useMemo(() => buildTree(files), [files]);
  // Expandir todas las marcas por defecto
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(() => new Set(tree.map((t) => t.brand)));
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState<Set<string>>(new Set()); // modelos con "ver más"

  const toggleBrand = (b: string) => {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      next.has(b) ? next.delete(b) : next.add(b);
      return next;
    });
  };
  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleModel = (key: string) => {
    setExpandedModels(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {tree.map((brandNode) => {
        const isOpen = expandedBrands.has(brandNode.brand);
        const totalFiles = Array.from(brandNode.folders.values())
          .reduce((sum, f) => sum + Array.from(f.models.values()).reduce((s, m) => s + m.files.length, 0), 0);

        return (
          <div key={brandNode.brand} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            {/* NIVEL 1: Brand */}
            <button
              onClick={() => toggleBrand(brandNode.brand)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-accent)] font-mono text-xs w-4">{isOpen ? '▼' : '▶'}</span>
                <span className="text-lg">📦</span>
                <span className="font-semibold">{brandNode.brand}</span>
              </div>
              <span className="text-xs text-[var(--color-muted)]">{totalFiles} archivos · {brandNode.folders.size} carpetas</span>
            </button>

            {isOpen && (
              <div className="border-t border-[var(--color-border)]">
                {Array.from(brandNode.folders.values()).map((folder) => {
                  const folderKey = `${brandNode.brand}/${folder.name}`;
                  const isFolderOpen = expandedFolders.has(folderKey);
                  const folderFiles = Array.from(folder.models.values()).reduce((s, m) => s + m.files.length, 0);

                  return (
                    <div key={folderKey} className="border-b border-[var(--color-border)] last:border-b-0">
                      {/* NIVEL 2: Carpeta */}
                      <button
                        onClick={() => toggleFolder(folderKey)}
                        className="w-full flex items-center justify-between pl-10 pr-5 py-2.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-muted)] font-mono text-xs w-4">{isFolderOpen ? '▼' : '▶'}</span>
                          <span>📁</span>
                          <span className="text-sm font-medium text-[var(--color-fg)]">{folder.name}</span>
                        </div>
                        <span className="text-xs text-[var(--color-muted)]">{folderFiles} archivos · {folder.models.size} modelos</span>
                      </button>

                      {isFolderOpen && (
                        <div className="bg-white/[0.02]">
                          {Array.from(folder.models.values()).map((modelNode) => {
                            const modelKey = `${folderKey}/${modelNode.name}`;
                            const isModelOpen = expandedModels.has(modelKey);

                            return (
                              <div key={modelKey}>
                                {/* NIVEL 3: Modelo */}
                                <button
                                  onClick={() => toggleModel(modelKey)}
                                  className="w-full flex items-center justify-between pl-16 pr-5 py-2 hover:bg-white/[0.04] transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--color-muted)] font-mono text-xs w-4">{isModelOpen ? '▼' : '▶'}</span>
                                    <span>📱</span>
                                    <span className="text-sm text-[var(--color-fg)]">{modelNode.name}</span>
                                  </div>
                                  <span className="text-xs text-[var(--color-muted)]">{modelNode.files.length} archivos</span>
                                </button>

                                {isModelOpen && (
                                  <div className="bg-black/20">
                                    {(() => {
                                      const limit = showAll.has(modelKey) ? modelNode.files.length : 20;
                                      const visibleFiles = modelNode.files.slice(0, limit);
                                      return (
                                        <>
                                          {visibleFiles.map((f) => {
                                            const blocked = f.isPremium && !hasSub;
                                            return (
                                              <div
                                                key={f.id}
                                                className={`flex items-center justify-between gap-4 pl-24 pr-5 py-2.5 hover:bg-white/[0.03] ${blocked ? 'opacity-60' : ''}`}
                                              >
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm text-[var(--color-fg)] truncate">{f.title}</p>
                                                    {f.isPremium && (
                                                      <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                                                        Premium
                                                      </span>
                                                    )}
                                                    <span className="shrink-0 text-[10px] text-[var(--color-muted)] rounded bg-white/5 px-1.5 py-0.5">
                                                      {f.category}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-3">
                                                  <span className="text-xs text-[var(--color-muted)] hidden sm:inline">
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
                                            <div className="pl-24 pr-5 py-2">
                                              <button
                                                onClick={() => {
                                                  setShowAll((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(modelKey)) next.delete(modelKey);
                                                    else next.add(modelKey);
                                                    return next;
                                                  });
                                                }}
                                                className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                                              >
                                                {showAll.has(modelKey)
                                                  ? `Ver menos ▲`
                                                  : `Ver ${modelNode.files.length - 20} archivos más ▼`}
                                              </button>
                                            </div>
                                          )}
                                          {/* Botón de descarga ZIP de toda la carpeta del modelo */}
                                          <div className="pl-24 pr-5 py-2 border-t border-white/5">
                                            <DownloadFolderButton
                                              folderPath={`/AcademiaJRubio/${folder.name}${modelNode.name !== folder.name ? '/' + modelNode.name : ''}`}
                                              label={`Descargar carpeta completa (${modelNode.files.length} archivos)`}
                                            />
                                          </div>
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
    </div>
  );
}
