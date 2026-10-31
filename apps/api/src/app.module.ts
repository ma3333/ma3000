import { DynamicModule, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AppConfig } from './config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';

@Module({})
export class AppModule implements NestModule {
  static forRoot(config: AppConfig): DynamicModule {
    return { module: AppModule, imports: [DbModule.forRoot(config), HealthModule] };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
