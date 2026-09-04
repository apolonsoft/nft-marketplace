import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiLogger } from '../common/logger';
import { MetricsController, MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
@Module({ controllers: [MetricsController], providers: [MetricsService, ApiLogger, MetricsInterceptor, { provide: APP_INTERCEPTOR, useExisting: MetricsInterceptor }], exports: [MetricsService] }) export class ObservabilityModule {}
