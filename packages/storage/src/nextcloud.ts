import { createClient, type WebDAVClient } from 'webdav';
import type { Readable } from 'node:stream';
import type {
  StorageAdapter,
  StorageFile,
  UploadInput,
  ShareLink,
  ShareLinkOptions,
} from './types';

export interface NextcloudConfig {
  /** URL base de Nextcloud, ej: https://cloud.example.com */
  baseUrl: string;
  username: string;
  /** "App Password" generado desde Nextcloud > Configuración > Seguridad */
  appPassword: string;
  /** Carpeta raíz dentro de Nextcloud donde se guardan los archivos */
  basePath: string;
}

/**
 * Implementación de StorageAdapter sobre Nextcloud usando WebDAV
 * (para upload/download) y la OCS Share API (para enlaces temporales).
 *
 * Notas:
 *  - WebDAV no tiene "presigned URLs" como S3. Para enlaces compartibles
 *    se usa la OCS API que crea un public share con expiración.
 *  - Los streams de descarga pasan por tu servidor si NO usas shareLink.
 */
export class NextcloudAdapter implements StorageAdapter {
  private client: WebDAVClient;

  constructor(private config: NextcloudConfig) {
    const webdavUrl = `${config.baseUrl.replace(/\/$/, '')}/remote.php/dav/files/${config.username}`;
    this.client = createClient(webdavUrl, {
      username: config.username,
      password: config.appPassword,
    });
  }

  private resolve(key: string): string {
    const base = this.config.basePath.replace(/^\/|\/$/g, '');
    const safeKey = key.replace(/^\//, '');
    return `/${base}/${safeKey}`;
  }

  async upload(input: UploadInput): Promise<StorageFile> {
    const fullPath = this.resolve(input.key);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (!(await this.client.exists(dir))) {
      await this.client.createDirectory(dir, { recursive: true });
    }

    // ReadableStream path: stream directly to WebDAV without buffering
    if (input.body instanceof ReadableStream) {
      return this.streamToWebDAV(fullPath, input.key, input.body, input.mimeType, input.contentLength);
    }

    // Buffer path
    let body: Buffer;
    if (Buffer.isBuffer(input.body)) {
      body = input.body;
    } else if (input.body instanceof Uint8Array) {
      body = Buffer.from(input.body);
    } else {
      // Node.js Readable → Buffer
      const chunks: Buffer[] = [];
      for await (const chunk of input.body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }

    await this.client.putFileContents(fullPath, body, { overwrite: true });

    const stat = await this.client.stat(fullPath);
    const fileSize = 'size' in stat ? stat.size : body.byteLength;

    return { key: input.key, size: fileSize, mimeType: input.mimeType };
  }

  private async streamToWebDAV(
    fullPath: string,
    key: string,
    stream: ReadableStream,
    mimeType?: string,
    contentLength?: number,
  ): Promise<StorageFile> {
    const webdavUrl = `${this.config.baseUrl.replace(/\/$/, '')}/remote.php/dav/files/${this.config.username}${fullPath}`;
    const auth = Buffer.from(`${this.config.username}:${this.config.appPassword}`).toString('base64');

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      'Content-Type': mimeType ?? 'application/octet-stream',
    };
    if (contentLength) headers['Content-Length'] = String(contentLength);

    const res = await fetch(webdavUrl, {
      method: 'PUT',
      headers,
      body: stream,
      // @ts-ignore -- Node.js 18+ requires duplex for streaming request bodies
      duplex: 'half',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Nextcloud WebDAV PUT falló: ${res.status} ${res.statusText} — ${text}`);
    }

    return { key, size: contentLength ?? 0, mimeType };
  }

  async download(key: string): Promise<Buffer> {
    const data = await this.client.getFileContents(this.resolve(key));
    return Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
  }

  async delete(key: string): Promise<void> {
    await this.client.deleteFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    return this.client.exists(this.resolve(key));
  }

  /**
   * Crea un public share temporal vía OCS API.
   * Docs: https://docs.nextcloud.com/server/latest/developer_manual/client_apis/OCS/ocs-share-api.html
   */
  async getShareLink(key: string, options: ShareLinkOptions = {}): Promise<ShareLink> {
    // Nextcloud requiere expireDate >= mañana (no acepta el mismo día).
    // Nuestro app puede revocar el share antes vía deleteShare() si quiere expiración granular.
    const expiresIn = options.expiresIn ?? 86400; // default 24h
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const minimum = new Date();
    minimum.setUTCDate(minimum.getUTCDate() + 1);
    const effectiveExpiry = expiresAt > minimum ? expiresAt : minimum;
    const expireDateStr = effectiveExpiry.toISOString().split('T')[0]!; // YYYY-MM-DD

    const ocsUrl = `${this.config.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
    const auth = Buffer.from(`${this.config.username}:${this.config.appPassword}`).toString('base64');

    const body = new URLSearchParams({
      path: this.resolve(key),
      shareType: '3', // 3 = public link
      permissions: '1', // 1 = read only
      expireDate: expireDateStr,
    });
    if (options.password) body.append('password', options.password);

    const res = await fetch(ocsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Nextcloud share failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as {
      ocs?: { data?: { url?: string } };
    };

    const url = json.ocs?.data?.url;
    if (!url) throw new Error('Nextcloud share API returned no URL');

    const downloadUrl = url.endsWith('/download') ? url : `${url}/download`;
    return { url: downloadUrl, expiresAt };
  }
}
