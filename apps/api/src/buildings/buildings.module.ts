import { Module } from '@nestjs/common';
import { CatalogController } from '../catalog/catalog.controller';
import { CatalogService } from '../catalog/catalog.service';
import { CurrentTenantController, PlatformTenantsController } from '../tenancy/tenancy.controller';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';

/** Tenancy (module 2) + building profile core (module 7): tenants, catalog, buildings, tree and assets. */
@Module({
  controllers: [PlatformTenantsController, CurrentTenantController, CatalogController, BuildingsController],
  providers: [CatalogService, BuildingsService],
})
export class BuildingsModule {}
