import { prisma } from '@academia/db';
import { assertAdmin } from '@/lib/admin';
import { PageHeader, Table, Th, Td, Badge, Empty } from '../_components/ui';
import { ResolveReportButton } from './resolve-button';

export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  danado:             'Archivo dañado',
  no_compatible:      'No compatible',
  version_incorrecta: 'Versión incorrecta',
  enlace_roto:        'No descarga',
  otro:               'Otro',
};

export default async function ReportesPage() {
  await assertAdmin();

  const reports = await prisma.fileReport.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: {
      user:     { select: { name: true, email: true } },
      fileItem: { select: { title: true, brand: true, category: true } },
    },
  });

  const pending   = reports.filter(r => r.status === 'pending').length;
  const resolved  = reports.filter(r => r.status === 'resolved').length;

  return (
    <>
      <PageHeader
        title="Reportes de archivos"
        subtitle={`${pending} pendiente${pending !== 1 ? 's' : ''} · ${resolved} resuelto${resolved !== 1 ? 's' : ''}`}
      />

      {reports.length === 0 ? (
        <Empty>Sin reportes todavía.</Empty>
      ) : (
        <Table head={
          <>
            <Th>Archivo</Th>
            <Th>Motivo</Th>
            <Th>Usuario</Th>
            <Th>Comentario</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </>
        }>
          {reports.map(r => (
            <tr key={r.id} className={`hover:bg-white/[0.02] ${r.status !== 'pending' ? 'opacity-50' : ''}`}>
              <Td>
                <p className="text-xs font-medium truncate max-w-[180px]">{r.fileItem.title}</p>
                <p className="text-[10px] text-[var(--color-muted)]">{r.fileItem.brand} · {r.fileItem.category}</p>
              </Td>
              <Td>
                <span className="text-xs">{REASON_LABEL[r.reason] ?? r.reason}</span>
              </Td>
              <Td>
                <p className="text-xs">{r.user.name ?? r.user.email}</p>
                <p className="text-[10px] text-[var(--color-muted)]">{r.user.email}</p>
              </Td>
              <Td>
                <p className="text-[11px] text-[var(--color-muted)] max-w-[200px] truncate">
                  {r.comment ?? '—'}
                </p>
              </Td>
              <Td>
                {r.status === 'pending'   && <Badge color="yellow">Pendiente</Badge>}
                {r.status === 'resolved'  && <Badge color="green">Resuelto</Badge>}
                {r.status === 'dismissed' && <Badge color="gray">Descartado</Badge>}
              </Td>
              <Td>
                {r.status === 'pending' && (
                  <ResolveReportButton reportId={r.id} />
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
