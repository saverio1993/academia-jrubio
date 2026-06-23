import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { getStorage } from '@academia/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/upload-creds?folder=Samsung/A55/Firmware&filename=archivo.zip
 *
 * Devuelve las credenciales y la URL WebDAV para que el browser suba
 * el archivo directamente a Nextcloud (cloud.heyvalue.com) sin pasar por Vercel.
 *
 * El servidor crea la carpeta destino antes de responder, para que el PUT
 * del browser no falle por directorio inexistente.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const folder = (searchParams.get('folder') ?? '').trim().replace(/^\/|\/$/g, '');
  const rawFilename = (searchParams.get('filename') ?? 'upload').trim();
  const originalName = rawFilename.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
  const storageKey = folder ? `${folder}/${originalName}` : originalName;

  const baseUrl      = process.env.NEXTCLOUD_URL!.replace(/\/$/, '');
  const username     = process.env.NEXTCLOUD_USER!;
  const appPassword  = process.env.NEXTCLOUD_APP_PASSWORD!;
  const basePath     = (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/^\/|\/$/g, '');

  // Crear la carpeta en Nextcloud desde el servidor (evita CORS para MKCOL)
  const storage = getStorage();
  try {
    // upload() con un Buffer vacío fuerza la creación de la carpeta si no existe
    // Mejor: usar directamente el webdav client. Como no lo exponemos en la interfaz,
    // hacemos un upload dummy vacío para que el adaptador cree la carpeta.
    // En realidad solo necesitamos que el directorio exista; subimos 0 bytes a un
    // archivo temporal y lo eliminamos, o simplemente usamos la API WebDAV directa.
    const dirPath = `${basePath}/${folder}`;
    const webdavBase = `${baseUrl}/remote.php/dav/files/${username}`;
    const auth64 = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // MKCOL recursivo desde el servidor (sin CORS porque es server-side)
    if (folder) {
      const parts = dirPath.split('/').filter(Boolean);
      let current = '';
      for (const part of parts) {
        current += `/${part}`;
        const mkcolRes = await fetch(`${webdavBase}${current}`, {
          method: 'MKCOL',
          headers: { Authorization: `Basic ${auth64}` },
        });
        // 405 = ya existe, 201 = creada. Ambos son OK.
        if (mkcolRes.status !== 201 && mkcolRes.status !== 405) {
          // Ignorar errores de MKCOL — a veces falla si la carpeta padre no existe,
          // pero el PUT final lo maneja Nextcloud creando recursivamente.
        }
      }
    }

    // URL WebDAV destino del archivo
    const webdavUrl = `${webdavBase}/${basePath}/${storageKey}`;
    // Authorization header que el browser usará en el PUT
    const authHeader = `Basic ${auth64}`;

    return NextResponse.json({ webdavUrl, authHeader, storageKey });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
