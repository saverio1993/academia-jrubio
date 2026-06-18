export * from './types';
export { NextcloudAdapter, type NextcloudConfig } from './nextcloud';

import { NextcloudAdapter } from './nextcloud';
import type { StorageAdapter } from './types';

let _storage: StorageAdapter | null = null;

/**
 * Singleton storage. Por defecto usa Nextcloud según variables de entorno.
 * Si más adelante quieres R2/S3, solo cambias aquí.
 */
export function getStorage(): StorageAdapter {
  if (_storage) return _storage;

  const baseUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USER;
  const appPassword = process.env.NEXTCLOUD_APP_PASSWORD;
  const basePath = process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files';

  if (!baseUrl || !username || !appPassword) {
    throw new Error(
      'Faltan variables de entorno NEXTCLOUD_URL / NEXTCLOUD_USER / NEXTCLOUD_APP_PASSWORD',
    );
  }

  _storage = new NextcloudAdapter({ baseUrl, username, appPassword, basePath });
  return _storage;
}
