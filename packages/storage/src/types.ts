import type { Readable } from 'node:stream';

export interface StorageFile {
  key: string;
  size: number;
  mimeType?: string;
  lastModified?: Date;
}

export interface UploadInput {
  key: string;
  body: Buffer | Uint8Array | ReadableStream | Readable;
  mimeType?: string;
  contentLength?: number;
}

export interface ShareLinkOptions {
  /** segundos de validez. Default 300 (5 min) */
  expiresIn?: number;
  /** opcional, password sobre el link */
  password?: string;
}

export interface ShareLink {
  url: string;
  expiresAt: Date;
}

/**
 * Contrato común para cualquier proveedor de storage.
 * Implementaciones: NextcloudAdapter (default), CloudflareR2Adapter, S3Adapter, ...
 */
export interface StorageAdapter {
  upload(input: UploadInput): Promise<StorageFile>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Genera un enlace temporal de descarga (cuando el proveedor lo soporta). */
  getShareLink(key: string, options?: ShareLinkOptions): Promise<ShareLink>;
}
