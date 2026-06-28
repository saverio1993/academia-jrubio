import { auth } from '@/auth';
import { TgAiChat } from './tg-ai-chat';

export const dynamic = 'force-dynamic';

export default async function TgIaPage() {
  const session = await auth();
  return <TgAiChat userName={session?.user?.name} />;
}
