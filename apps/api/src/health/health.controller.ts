import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { HealthStatus } from '@ma3000/shared';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async get(@Res({ passthrough: true }) res: Response): Promise<HealthStatus> {
    const result = await this.health.check();
    if (result.status !== 'ok') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
