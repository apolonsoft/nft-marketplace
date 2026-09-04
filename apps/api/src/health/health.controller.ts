import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
@ApiTags('health') @Controller('health') export class HealthController { constructor(@Inject(HealthService) private readonly health: HealthService) {} @Get('live') @ApiOperation({ summary: 'Process liveness' }) @ApiResponse({ status: 200 }) live() { return { status: 'live' }; } @Get('ready') @ApiOperation({ summary: 'Dependency readiness' }) @ApiResponse({ status: 200 }) @ApiResponse({ status: 503 }) ready() { return this.health.readiness(); } }
