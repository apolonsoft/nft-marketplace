import { Module } from '@nestjs/common';
import { WorkerMetrics } from './metrics.js';
import { WorkerRuntimeService } from './runtime.service.js';

@Module({ providers: [WorkerMetrics, WorkerRuntimeService] })
export class WorkerModule {}
