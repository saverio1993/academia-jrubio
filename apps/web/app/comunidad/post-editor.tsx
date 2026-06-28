'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';

interface Props {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

const EMOJIS = [
  '✅','❌','⚠️','🔥','💡','📱','💻','🔧','🛠️','🔑',
  '📂','📥','📤','🔗','💬','👍','👎','❤️','⭐','🚀',
  '📷','🖼️','📝','📌','🔒','🔓','⚡','✨','🎯','💾',
  '😊','😅','🤔','👀','🙏','💪','🎉','🔴','🟡','🟢',
];

const COLORS = [
  '#f97316','#ef4444','#f59e0b','#22c55e','#3b82f6',
  '#8b5cf6','#ec4899','#06b6d4','#ffffff','#a1a1aa',
];

const SEP = 'sep';

const ROW1 = [
  { id:'h1',   icon:'H1',   title:'Encabezado 1',    prefix:'# ' },
  { id:'h2',   icon:'H2',   title:'Encabezado 2',    prefix:'## ' },
  { id:'h3',   icon:'H3',   title:'Encabezado 3',    prefix:'### ' },
  SEP,
  { id:'bold', icon:'B',    title:'Negrita',          wrap:['**','**'], ph:'texto' },
  { id:'ital', icon:'I',    title:'Cursiva',          wrap:['*','*'],   ph:'texto' },
  { id:'und',  icon:'U',    title:'Subrayado',        wrap:['<u>','</u>'], ph:'texto' },
  { id:'str',  icon:'S̶',    title:'Tachado',          wrap:['~~','~~'], ph:'texto' },
  SEP,
  { id:'color',icon:'A',    title:'Color de texto',   special:'color' },
  SEP,
  { id:'emoji',icon:'😊',   title:'Emoji',            special:'emoji' },
] as const;

const ROW2 = [
  { id:'link', icon:'🔗',   title:'Insertar enlace',  special:'link' },
  { id:'img',  icon:'📷',   title:'Insertar imagen',  special:'image' },
  SEP,
  { id:'ul',   icon:'• —',  title:'Lista sin orden',  prefix:'- ' },
  { id:'ol',   icon:'1. —', title:'Lista numerada',   prefix:'1. ' },
  { id:'bq',   icon:'❝',    title:'Cita',             prefix:'> ' },
  { id:'hr',   icon:'—',    title:'Separador',        insert:'\n---\n' },
  SEP,
  { id:'code', icon:'</>',  title:'Bloque de código', wrap:['```\n','\n```'], ph:'código' },
  { id:'tbl',  icon:'⊞',    title:'Tabla',            special:'table' },
] as const;

function Divider() {
  return <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />;
}

type BtnProps = {
  icon: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
};
function Btn({ icon, title, active, disabled, onClick, style }: BtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`
        relative inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md text-xs font-bold transition-all
        ${active
          ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/40'
          : 'text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)] border border-transparent hover:border-[var(--color-border)]'
        }
        disabled:opacity-30 disabled:cursor-not-allowed
      `}
    >
      {icon}
    </button>
  );
}

export function PostEditor({ value, onChange, rows = 14 }: Props) {
  const [preview, setPreview]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [showEmoji, setShowEmoji]   = useState(false);
  const [showColor, setShowColor]   = useState(false);
  const [showLink, setShowLink]     = useState(false);
  const [linkUrl, setLinkUrl]       = useState('');
  const [linkText, setLinkText]     = useState('');
  const [textColor, setTextColor]   = useState('#f97316');

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiRef     = useRef<HTMLDivElement>(null);
  const colorRef     = useRef<HTMLDivElement>(null);
  const linkRef      = useRef<HTMLDivElement>(null);

  // Close popups on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColor(false);
      if (linkRef.current  && !linkRef.current.contains(e.target as Node))  setShowLink(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const getSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return { start: 0, end: 0, selected: '' };
    return { start: ta.selectionStart, end: ta.selectionEnd, selected: value.slice(ta.selectionStart, ta.selectionEnd) };
  }, [value]);

  const insertAt = useCallback((text: string, cursorOffset?: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end } = { start: ta.selectionStart, end: ta.selectionEnd };
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = cursorOffset !== undefined ? start + cursorOffset : start + text.length;
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }, [value, onChange]);

  const wrapSelection = useCallback((before: string, after: string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = value.slice(start, end) || placeholder;
    const next  = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd   = start + before.length + sel.length;
    });
  }, [value, onChange]);

  const insertPrefix = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    // Find start of current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + prefix.length;
    });
  }, [value, onChange]);

  async function handleImageFile(file: File) {
    setUploading(true);
    try {
      const res = await fetch(
        `/api/comunidad/upload?filename=${encodeURIComponent(file.name)}`,
        { method: 'POST', headers: { 'Content-Type': file.type || 'image/jpeg', 'Content-Length': String(file.size) }, body: file },
      );
      if (!res.ok) { const { error } = await res.json() as {error:string}; alert(error); return; }
      const { publicUrl, fileName } = await res.json() as { publicUrl: string; fileName: string };
      const src = publicUrl.endsWith('/download') ? publicUrl : `${publicUrl}/download`;
      insertAt(`\n![${fileName}](${src})\n`);
    } catch { alert('Error de red'); }
    finally { setUploading(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
  }

  function handleLink() {
    const { selected } = getSelection();
    setLinkText(selected || '');
    setLinkUrl('');
    setShowLink(true);
    setShowEmoji(false);
    setShowColor(false);
  }

  function insertLink() {
    const text = linkText || linkUrl;
    insertAt(`[${text}](${linkUrl})`);
    setShowLink(false);
    setLinkUrl('');
    setLinkText('');
  }

  function insertTable() {
    insertAt('\n| Columna 1 | Columna 2 | Columna 3 |\n|-----------|-----------|----------|\n| Celda     | Celda     | Celda    |\n');
  }

  function insertColoredText() {
    wrapSelection(`<span style="color:${textColor}">`, '</span>', 'texto');
    setShowColor(false);
  }

  // Row button click dispatcher
  function handleRow1(item: typeof ROW1[number]) {
    if (item === SEP) return;
    if ('special' in item) {
      if (item.special === 'color') { setShowColor(v => !v); setShowEmoji(false); setShowLink(false); }
      if (item.special === 'emoji') { setShowEmoji(v => !v); setShowColor(false); setShowLink(false); }
      return;
    }
    if ('prefix' in item) insertPrefix(item.prefix);
    if ('wrap' in item) wrapSelection(item.wrap[0], item.wrap[1], item.ph);
  }

  function handleRow2(item: typeof ROW2[number]) {
    if (item === SEP) return;
    if ('special' in item) {
      if (item.special === 'link')  handleLink();
      if (item.special === 'image') imageInputRef.current?.click();
      if (item.special === 'table') insertTable();
      return;
    }
    if ('prefix' in item) insertPrefix(item.prefix);
    if ('wrap'   in item) wrapSelection(item.wrap[0], item.wrap[1], item.ph);
    if ('insert' in item) insertAt(item.insert);
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-visible">
      {/* ── TOOLBAR ── */}
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] px-2 pt-2 pb-1 rounded-t-xl">
        {/* Row 1 */}
        <div className="flex items-center gap-0.5 flex-wrap mb-1">
          {ROW1.map((item, i) =>
            item === SEP ? <Divider key={`sep${i}`} /> : (
              <div key={item.id} className="relative">
                <Btn
                  icon={'icon' in item ? item.icon : ''}
                  title={'title' in item ? item.title : ''}
                  disabled={uploading}
                  active={
                    (item.id === 'emoji' && showEmoji) ||
                    (item.id === 'color' && showColor)
                  }
                  style={item.id === 'bold' ? { fontWeight: 900 } :
                         item.id === 'ital' ? { fontStyle: 'italic' } :
                         item.id === 'und'  ? { textDecoration: 'underline' } :
                         item.id === 'str'  ? { textDecoration: 'line-through' } :
                         item.id === 'color'? { color: textColor, borderBottom: `2px solid ${textColor}` } : undefined}
                  onClick={() => handleRow1(item)}
                />

                {/* Color popup */}
                {item.id === 'color' && showColor && (
                  <div ref={colorRef} className="absolute left-0 top-8 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl p-3 min-w-[180px]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">Color de texto</p>
                    <div className="grid grid-cols-5 gap-1.5 mb-2">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setTextColor(c); }}
                          className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110"
                          style={{ background: c, borderColor: textColor === c ? 'white' : 'transparent' }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={textColor}
                      onChange={e => setTextColor(e.target.value)}
                      className="w-full h-7 rounded cursor-pointer border border-[var(--color-border)]"
                    />
                    <button
                      type="button"
                      onClick={insertColoredText}
                      className="mt-2 w-full rounded-lg py-1.5 text-xs font-bold text-white"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      Aplicar color
                    </button>
                  </div>
                )}

                {/* Emoji popup */}
                {item.id === 'emoji' && showEmoji && (
                  <div ref={emojiRef} className="absolute left-0 top-8 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl p-2" style={{ width: 260 }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1.5 px-1">Emoji</p>
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { insertAt(e); setShowEmoji(false); }}
                          style={{ width: 28, height: 28, fontSize: 15, lineHeight: 1, overflow: 'hidden', flexShrink: 0 }}
                          className="rounded-md hover:bg-[var(--color-bg)] transition-colors flex items-center justify-center"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          <div className="flex-1" />
          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setPreview(v => !v)}
            className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-md text-xs font-semibold border transition-all ${
              preview
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/40'
                : 'text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-fg)]'
            }`}
          >
            {preview ? '✏️ Editar' : '👁 Preview'}
          </button>
        </div>

        {/* Row 2 */}
        <div className="flex items-center gap-0.5 flex-wrap relative">
          {ROW2.map((item, i) =>
            item === SEP ? <Divider key={`sep2${i}`} /> : (
              <div key={item.id} className="relative">
                <Btn
                  icon={'icon' in item ? item.icon : ''}
                  title={'title' in item ? item.title : ''}
                  disabled={uploading && item.id === 'img'}
                  onClick={() => handleRow2(item)}
                />
                {item.id === 'img' && uploading && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--color-accent)] animate-pulse" />
                )}
              </div>
            )
          )}

          {/* Link popup */}
          {showLink && (
            <div ref={linkRef} className="absolute left-0 top-8 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl p-3 w-72">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">Insertar enlace</p>
              <input
                autoFocus
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://..."
                onKeyDown={e => e.key === 'Enter' && insertLink()}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[var(--color-accent)]"
              />
              <input
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                placeholder="Texto del enlace (opcional)"
                onKeyDown={e => e.key === 'Enter' && insertLink()}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[var(--color-accent)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={insertLink}
                  disabled={!linkUrl}
                  className="flex-1 rounded-lg py-1.5 text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: 'var(--color-accent)' }}
                >
                  Insertar
                </button>
                <button
                  type="button"
                  onClick={() => setShowLink(false)}
                  className="px-3 rounded-lg py-1.5 text-xs text-[var(--color-muted)] border border-[var(--color-border)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden image input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
      />

      {/* ── EDITOR AREA ── */}
      {preview ? (
        <div
          className="post-content min-h-[320px] bg-[var(--color-card)] px-5 py-4 text-sm rounded-b-xl"
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
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder="Escribe aquí tu publicación...&#10;&#10;Usa la barra de herramientas para dar formato, insertar imágenes y más."
          className="w-full rounded-b-xl bg-[var(--color-card)] px-5 py-4 text-sm font-mono resize-y leading-relaxed placeholder:text-[var(--color-muted)] focus:outline-none"
        />
      )}
    </div>
  );
}
