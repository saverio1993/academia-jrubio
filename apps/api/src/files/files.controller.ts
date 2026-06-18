import { Controller, Get, Post, Query, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  async list(
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.files.list({
      brand,
      category,
      q,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Post(':id/download')
  async download(@Param('id') id: string, @Req() req: Request) {
    // TODO: agregar guard de autenticación + verificar suscripción activa
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    const ip = req.ip;
    return this.files.getDownloadLink(id, userId, ip);
  }
}
