'use client';

import { useState, useTransition } from 'react';
import { toggleReaction } from './actions';

type ReactionType = 'like' | 'heart' | 'fire';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like',  emoji: '👍', label: 'Me gusta' },
  { type: 'heart', emoji: '❤️', label: 'Me encanta' },
  { type: 'fire',  emoji: '🔥', label: 'Fuego' },
];

interface Props {
  slug: string;
  counts: Record<string, number>;
  userReactions: string[];
  canReact: boolean;
}

export function ReactionBar({ slug, counts: initialCounts, userReactions: initialUserReactions, canReact }: Props) {
  const [counts, setCounts] = useState(initialCounts);
  const [userReactions, setUserReactions] = useState(new Set(initialUserReactions));
  const [pending, startTransition] = useTransition();

  function handleToggle(type: ReactionType) {
    if (!canReact) return;
    const has = userReactions.has(type);
    setCounts((prev) => ({ ...prev, [type]: (prev[type] ?? 0) + (has ? -1 : 1) }));
    setUserReactions((prev) => {
      const next = new Set(prev);
      has ? next.delete(type) : next.add(type);
      return next;
    });
    startTransition(() => toggleReaction(slug, type));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {REACTIONS.map(({ type, emoji, label }) => {
        const active = userReactions.has(type);
        const count = counts[type] ?? 0;
        return (
          <button
            key={type}
            onClick={() => handleToggle(type)}
            disabled={!canReact || pending}
            title={canReact ? label : 'Inicia sesión y suscríbete para reaccionar'}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border transition-all disabled:opacity-50"
            style={
              active
                ? { background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.4)', color: 'var(--color-accent)' }
                : { background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }
            }
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
