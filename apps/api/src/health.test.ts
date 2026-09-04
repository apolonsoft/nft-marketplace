import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { HealthService, type DependencyProbe } from './health/health.service';

const up = (): DependencyProbe => ({ check: async () => ({ status: 'up' }) });
const down = (): DependencyProbe => ({ check: async () => { throw new Error('offline'); } });
describe('HealthService', () => {
  it('reports ready when dependencies pass', async () => { await expect(new HealthService(up(), up()).readiness()).resolves.toMatchObject({ status: 'ready' }); });
  it('distinguishes dependency failures', async () => { await expect(new HealthService(down(), up()).readiness()).rejects.toBeInstanceOf(ServiceUnavailableException); });
});
