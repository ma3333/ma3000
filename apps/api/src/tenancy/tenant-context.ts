import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AppConfig } from '../config';
import { CONFIG } from '../db/tokens';

export const TENANT_HEADER = 'x-tenant-id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TenantRequest = Request & { tenantId?: string };

/**
 * Resolves the current tenant. Until identity/auth (module 3) exists, the tenant comes from the x-tenant-id header and
 * this is allowed only with DEV_MODE=true. Auth will replace this with the tenant from the verified session.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<TenantRequest>();
    if (!this.config.DEV_MODE) throw new UnauthorizedException('Authentication is not configured yet');
    const id = req.header(TENANT_HEADER);
    if (!id || !UUID_RE.test(id))
      throw new UnauthorizedException(`Missing or invalid ${TENANT_HEADER} header`);
    req.tenantId = id;
    return true;
  }
}

/** Platform-admin endpoints. Only available in DEV_MODE until platform roles exist. */
@Injectable()
export class PlatformGuard implements CanActivate {
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  canActivate(): boolean {
    if (!this.config.DEV_MODE) throw new ForbiddenException('Platform endpoints are disabled');
    return true;
  }
}

export const TenantId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<TenantRequest>().tenantId as string,
);
