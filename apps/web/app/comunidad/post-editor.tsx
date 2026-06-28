'use client';

import { useRef, useState } from 'react';
import { marked } from 'marked';

interface Props {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

type ToolbarAction =
  | { label: string; title: string; wrap: [string, string]; placeholder: string }
  | { label: string; title: string; prefix: string }
  | { label: string; title: string; image: true };

const TOOLBAR: ToolbarAction[] = [
  { label: '**B**',  title: 'Negrita',   wrap: ['**', '**'], placeholder: 'texto' },
  { label: '*I*',    title: 'Cursiva',   wrap: ['*', '*'],   placeholder: 'texto' },
  { label: '`</>`',  title: 'Código',    wrap: ['`', '`'],   placeholder: 'código' },
  { label: '##',     title: 'Título',    prefix: '## ' },
  { label: '> ',     title: 'Cita',      prefix: '> ' },
  { label: '📷',     title: 'Insertar imagen', image: true },
];

export function PostEditor({ value, onChange, rows = 14 }: Props) {
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function insertAt(text: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    });
  }

  function wrapSelection(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  }

  async function handleImageFile(file: File) {
    setUploading(true);
    try {
      const res = await fetch(
        `/api/comunidad/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'image/jpeg',
            'Content-Length': String(file.size),
          },
          body: file,
        },
      );
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        alert(error ?? 'Error al subir la imagen');
        return;
      }
      const { publicUrl, fileName } = (await res.json()) as { publicUrl: string; fileName: string };
      const imgUrl = publicUrl.endsWith('/download') ? publicUrl : `${publicUrl}/download`;
      insertAt(`\n![${fileName}](${imgUrl})\n`);
    } catch {
      alert('Error de red al subir la imagen');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  function handleToolbar(action: ToolbarAction) {
    if ('image' in action) {
      imageInputRef.current?.click();
      return;
    }
    if ('wrap' in action) {
      wrapSelection(action.wrap[0], action.wrap[1], action.placeholder);
    } else {
      insertAt(action.prefix);
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        {TOOLBAR.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.title}
            disabled={uploading}
            onClick={() => handleToolbar(action)}
            className="px-2 py-1 rounded-lg border border-[var(--color-border)] text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 transition-colors disabled:opacity-40"
          >
            {'image' in action && uploading ? '⏳' : action.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="px-2 py-1 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          {preview ? '✏️ Editar' : '👁 Preview'}
        </button>
      </div>

      {/* Hidden file input for inline images */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />

      {preview ? (
        <div
          className="post-content min-h-[280px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm"
          dangerouslySetInnerHTML={{
            __html: value
              ? (marked.parse(value) as string)
              : '<p style="color:var(--color-muted)">Sin contenido aún…</p>',
          }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          name="content"
          required
          minLength={20}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={`# Método paso a paso\n\n## Requisitos\n- Odin 3.14\n- Cable USB\n\n## Pasos\n1. Descargar el archivo...\n2. Abrir Odin...\n\n> Nota: funciona en A55 con One UI 6.`}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-mono resize-y leading-relaxed placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      )}
      <p className="text-[11px] text-[var(--color-muted)] mt-1.5">
        Markdown: **negrita**, *cursiva*, `código`, ## Título, &gt; cita — 📷 para insertar imagen en el texto
      </p>
    </div>
  );
}
