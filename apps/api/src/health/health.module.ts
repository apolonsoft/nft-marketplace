import { Module } from '@nestjs/common';
import { DATABASE_PROBE, INDEXER_PROBE } from '../common/tokens';
import { DatabaseProbe, HealthService, IndexerProbe } from './health.service';
import { HealthController } from './health.controller';
@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseProbe,
    IndexerProbe,
    { provide: DATABASE_PROBE, useExisting: DatabaseProbe },
    { provide: INDEXER_PROBE, useExisting: IndexerProbe },
  ],
  exports: [HealthService],
})
export class HealthModule {}
