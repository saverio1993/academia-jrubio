import { Injectable } from '@nestjs/common';
import { NextcloudAdapter, type StorageAdapter } from '@academia/storage';

@Injectable()
export class StorageService {
  public readonly adapter: StorageAdapter;

  constructor() {
    const baseUrl = process.env.NEXTCLOUD_URL;
    const username = process.env.NEXTCLOUD_USER;
    const appPassword = process.env.NEXTCLOUD_APP_PASSWORD;
    const basePath = process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files';

    if (!baseUrl || !username || !appPassword) {
      throw new Error('Faltan variables NEXTCLOUD_* en .env');
    }

    this.adapter = new NextcloudAdapter({ baseUrl, username, appPassword, basePath });
  }
}
