import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { StorageService } from './storage.service';

@ApiTags('Files')
@Controller('file')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get('*')
  @ApiOperation({
    summary: 'Proxy-serve a stored file by its R2 object key',
    description:
      'Public endpoint — no authentication required. ' +
      'The full object key (e.g. reports/bookingId/timestamp-name.pdf) ' +
      'is captured as a wildcard path and fetched from R2.',
  })
  @ApiOkResponse({ description: 'File stream' })
  async serveFile(
    @Param('0') key: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!key) {
      throw new NotFoundException('File key is required.');
    }

    const { stream, contentType } = await this.storage.getObject(key);

    const filename = key.split('/').pop() ?? 'file';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    stream.pipe(res);
  }
}
