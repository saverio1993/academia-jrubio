import { prisma } from '@academia/db';
import { assertAdmin } from '@/lib/admin';
import { PageHeader, Table, Th, Td, Badge, Empty } from '../_components/ui';
import { CreateLinkForm } from './create-link-form';
import { CopyButton } from './copy-button';
import { RevokeButton } from './revoke-button';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.APP_URL ?? 'https://academia-jrubio-web.vercel.app';

export default async function LinksPage() {
  await assertAdmin();

  const [files, links] = await Promise.all([
    prisma.fileItem.findMany({
      select: { id: true, title: true, brand: true },
      orderBy: [{ brand: 'asc' }, { title: 'asc' }],
      take: 500,
    }),
    prisma.oneTimeLink.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        fileItem:  { select: { title: true, brand: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  const now = new Date();

  return (
    <>
      <PageHeader title="Links de un solo uso" subtitle="Comparte archivos sin necesidad de suscripción" />

      <div className="mb-8">
        <CreateLinkForm files={files} />
      </div>

      {links.length === 0 ? (
        <Empty>Sin links creados todavía.</Empty>
      ) : (
        <Table head={
          <>
            <Th>Archivo</Th>
            <Th>Link</Th>
            <Th>Nota</Th>
            <Th>Estado</Th>
            <Th>Vence</Th>
            <Th>Creado por</Th>
            <Th></Th>
          </>
        }>
          {links.map(l => {
            const url      = `${APP_URL}/dl/${l.token}`;
            const used     = !!l.usedAt;
            const expired  = !used && now > l.expiresAt;
            const active   = !used && !expired;

            return (
              <tr key={l.id} className={`hover:bg-white/[0.02] ${!active ? 'opacity-50' : ''}`}>
                <Td>
                  <p className="text-xs font-medium truncate max-w-[160px]">{l.fileItem.title}</p>
                  <p className="text-[10px] text-[var(--color-muted)]">{l.fileItem.brand}</p>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-[var(--color-muted)] truncate max-w-[100px]">/dl/{l.token.slice(0,8)}…</span>
                    {active && <CopyButton text={url} />}
                  </div>
                </Td>
                <Td><span className="text-xs text-[var(--color-muted)]">{l.note ?? '—'}</span></Td>
                <Td>
                  {active  && <Badge color="green">Activo</Badge>}
                  {used    && <Badge color="gray">Usado · {l.usedByIp}</Badge>}
                  {expired && <Badge color="yellow">Expirado</Badge>}
                </Td>
                <Td>
                  <span className="text-xs text-[var(--color-muted)] whitespace-nowrap">
                    {l.expiresAt.toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Td>
                <Td><span className="text-xs">{l.createdBy.name ?? l.createdBy.email}</span></Td>
                <Td>{active && <RevokeButton id={l.id} />}</Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
