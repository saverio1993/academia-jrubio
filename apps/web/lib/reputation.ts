import { prisma } from '@academia/db';

export const LEVELS = [
  { min: 400, label: 'Maestro', emoji: '🏆', color: '#f59e0b' },
  { min: 150, label: 'Experto', emoji: '⚡', color: '#8b5cf6' },
  { min: 50,  label: 'Técnico', emoji: '🔧', color: '#3b82f6' },
  { min: 0,   label: 'Novato',  emoji: '🌱', color: '#22c55e' },
] as const;

export type ReputationLevel = (typeof LEVELS)[number];

export function getLevel(points: number): ReputationLevel {
  return LEVELS.find((l) => points >= l.min) ?? LEVELS[LEVELS.length - 1]!;
}

export async function recalculateReputation(userId: string): Promise<number> {
  const [posts, reactions, solutions, pinned] = await Promise.all([
    prisma.post.count({ where: { authorId: userId, status: 'PUBLISHED' } }),
    prisma.postReaction.count({ where: { post: { authorId: userId } } }),
    prisma.postComment.count({ where: { authorId: userId, isSolution: true } }),
    prisma.post.count({ where: { authorId: userId, pinned: true } }),
  ]);
  const reputation = posts * 10 + reactions * 3 + solutions * 25 + pinned * 15;
  await prisma.user.update({ where: { id: userId }, data: { reputation } });
  return reputation;
}
