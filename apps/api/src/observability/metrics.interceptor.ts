import { Controller, Get, HttpException, Inject, Injectable, Module, Res } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { finalize, tap } from 'rxjs/operators';
import { ApiLogger } from '../common/logger';
import { MetricsService } from './metrics.service';
@Injectable() export class MetricsInterceptor implements NestInterceptor { constructor(@Inject(MetricsService) private readonly metrics: MetricsService, @Inject(ApiLogger) private readonly logger: ApiLogger) {} intercept(context: ExecutionContext, next: CallHandler) { if (context.getType() !== 'http') return next.handle(); const request = context.switchToHttp().getRequest(); const response = context.switchToHttp().getResponse(); const start = process.hrtime.bigint(); let errorStatus: number | undefined; return next.handle().pipe(tap({ error: (error) => { errorStatus = error instanceof HttpException ? error.getStatus() : 500; } }), finalize(() => { const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9; const labels = { method: request.method, route: request.route?.path ?? request.path, status: String(errorStatus ?? response.statusCode) }; this.metrics.requests.inc(labels); this.metrics.duration.observe(labels, durationSeconds); this.logger.structured.info('HTTP request completed', { ...labels, durationSeconds, requestId: request.requestId }); })); } }
@Controller('metrics') export class MetricsController { constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {} @Get() async get(@Res() response: Response) { response.type(this.metrics.registry.contentType).send(await this.metrics.registry.metrics()); } }
