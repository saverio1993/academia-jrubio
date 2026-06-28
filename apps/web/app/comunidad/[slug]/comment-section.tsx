'use client';

import { useState, useTransition } from 'react';
import { addComment, deleteComment, markAsSolution } from './actions';
import { initials, timeAgo } from '../categories';

interface Author {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: Date;
  author: Author;
  parentId: string | null;
  isSolution: boolean;
  replies: CommentData[];
}

interface Props {
  slug: string;
  comments: CommentData[];
  canComment: boolean;
  currentUserId?: string;
  isAdmin: boolean;
  postAuthorId: string;
}

function Avatar({ author, size = 8 }: { author: Author; size?: number }) {
  const sz = `${size * 4}px`;
  // eslint-disable-next-line @next/next/no-img-element
  if (author.image) return <img src={author.image} alt="" style={{ width: sz, height: sz }} className="rounded-full object-cover shrink-0" />;
  return (
    <div
      style={{ width: sz, height: sz, background: 'rgba(249,115,22,0.15)', color: 'var(--color-accent)', fontSize: 11 }}
      className="rounded-full flex items-center justify-center font-bold shrink-0"
    >
      {initials(author.name, author.email)}
    </div>
  );
}

function CommentBox({
  slug, parentId, onCancel, placeholder = 'Escribe un comentario…',
}: { slug: string; parentId?: string; onCancel?: () => void; placeholder?: string }) {
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try { await addComment(slug, text, parentId); setText(''); onCancel?.(); }
      catch (err: unknown) { if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) setError(err.message); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-xs font-medium text-red-400">{error}</p>}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={3000}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm resize-none placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {pending ? '⏳' : '💬'} Comentar
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function SingleComment({
  comment, slug, canComment, currentUserId, isAdmin, postAuthorId, isReply = false,
}: {
  comment: CommentData;
  slug: string;
  canComment: boolean;
  currentUserId?: string;
  isAdmin: boolean;
  postAuthorId: string;
  isReply?: boolean;
}) {
  const [showReply, setShowReply] = useState(false);
  const [pendingDelete, startDelete] = useTransition();
  const [pendingSolution, startSolution] = useTransition();

  const canDelete = isAdmin || comment.author.id === currentUserId;
  const canMarkSolution = !isReply && (isAdmin || currentUserId === postAuthorId);

  return (
    <div className={isReply ? 'ml-8 sm:ml-11' : ''}>
      <div className="flex items-start gap-3">
        <Avatar author={comment.author} size={isReply ? 7 : 8} />
        <div className="flex-1 min-w-0">
          <div
            className="rounded-xl border px-3 py-2.5 transition-colors"
            style={
              comment.isSolution
                ? { borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.06)' }
                : { borderColor: 'var(--color-border)', background: 'var(--color-card)' }
            }
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">
                  {comment.author.name ?? comment.author.email?.split('@')[0]}
                </span>
                {comment.isSolution && (
                  <span
                    className="text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    ✅ Solución
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--color-muted)]">{timeAgo(comment.createdAt)}</span>
                {canDelete && (
                  <button
                    onClick={() => { if (!confirm('¿Eliminar comentario?')) return; startDelete(() => deleteComment(slug, comment.id)); }}
                    disabled={pendingDelete}
                    className="text-[11px] text-[var(--color-muted)] hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-3 mt-1.5 ml-1">
            {!isReply && canComment && (
              <button
                onClick={() => setShowReply(v => !v)}
                className="text-[11px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                Responder
              </button>
            )}

            {canMarkSolution && (
              <button
                onClick={() => startSolution(() => markAsSolution(slug, comment.id))}
                disabled={pendingSolution}
                className="text-[11px] font-semibold transition-colors disabled:opacity-40"
                style={{ color: comment.isSolution ? '#22c55e' : 'var(--color-muted)' }}
              >
                {pendingSolution ? '⏳' : comment.isSolution ? '✅ Desmarcar solución' : '✓ Marcar como solución'}
              </button>
            )}
          </div>

          {showReply && (
            <div className="mt-2">
              <CommentBox
                slug={slug}
                parentId={comment.id}
                onCancel={() => setShowReply(false)}
                placeholder={`Responder a ${comment.author.name ?? 'este usuario'}…`}
              />
            </div>
          )}
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map(reply => (
            <SingleComment
              key={reply.id}
              comment={reply}
              slug={slug}
              canComment={canComment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              postAuthorId={postAuthorId}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ slug, comments, canComment, currentUserId, isAdmin, postAuthorId }: Props) {
  const rootComments = comments.filter(c => !c.parentId);
  const solution = rootComments.find(c => c.isSolution);
  const rest = rootComments.filter(c => !c.isSolution);
  const ordered = solution ? [solution, ...rest] : rest;

  return (
    <div>
      <h2 className="text-base font-bold mb-4">
        💬 Comentarios <span className="text-[var(--color-muted)] font-normal text-sm">({comments.length})</span>
      </h2>

      {/* Solution banner */}
      {solution && (
        <div
          className="rounded-xl border p-4 mb-5"
          style={{ borderColor: 'rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.07)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✅</span>
            <p className="text-sm font-bold" style={{ color: '#22c55e' }}>Respuesta marcada como solución</p>
          </div>
          <SingleComment
            comment={solution}
            slug={slug}
            canComment={canComment}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            postAuthorId={postAuthorId}
          />
        </div>
      )}

      {canComment && (
        <div className="mb-6">
          <CommentBox slug={slug} placeholder="Añade tu comentario…" />
        </div>
      )}

      {!canComment && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center mb-6 text-sm">
          <a href="/signin" className="font-semibold" style={{ color: 'var(--color-accent)' }}>Inicia sesión</a>{' '}
          y suscríbete para comentar
        </div>
      )}

      {ordered.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)] text-center py-8">Sin comentarios aún. ¡Sé el primero!</p>
      ) : (
        <div className="space-y-4">
          {ordered.map(c => (
            <SingleComment
              key={c.id}
              comment={c}
              slug={slug}
              canComment={canComment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              postAuthorId={postAuthorId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
