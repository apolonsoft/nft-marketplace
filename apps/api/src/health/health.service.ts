import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { connect } from 'node:net';
import type { ApiConfig } from '../config/config.service';
import { API_CONFIG, DATABASE_PROBE, INDEXER_PROBE } from '../common/tokens';
export interface DependencyProbe {
  check(): Promise<{ status: 'up'; details?: Record<string, unknown> }>;
}
const withTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  milliseconds: number,
) => {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('dependency check timed out')),
    milliseconds,
  );
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};
@Injectable()
export class DatabaseProbe implements DependencyProbe {
  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {}
  async check() {
    const url = new URL(this.config.databaseUrl);
    const port = Number(url.port || 5432);
    await withTimeout(
      (signal) =>
        new Promise<void>((resolve, reject) => {
          const socket = connect({ host: url.hostname, port });
          const abort = () => {
            socket.destroy();
            reject(signal.reason);
          };
          signal.addEventListener('abort', abort, { once: true });
          socket.once('connect', () => {
            signal.removeEventListener('abort', abort);
            socket.destroy();
            resolve();
          });
          socket.once('error', (error) => {
            signal.removeEventListener('abort', abort);
            reject(error);
          });
        }),
      this.config.dependencyTimeoutMs,
    );
    return { status: 'up' as const };
  }
}
@Injectable()
export class IndexerProbe implements DependencyProbe {
  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {}
  async check() {
    const response = await withTimeout(
      (signal) => fetch(this.config.indexerHealthUrl, { signal }),
      this.config.dependencyTimeoutMs,
    );
    if (!response.ok) throw new Error(`indexer returned ${response.status}`);
    const body = (await response.json()) as { latestBlockTimestamp?: string | number };
    const timestamp = new Date(body.latestBlockTimestamp ?? 0).getTime();
    const stalenessMs = Date.now() - timestamp;
    if (!Number.isFinite(timestamp) || stalenessMs > this.config.indexerMaxStalenessMs)
      throw new Error('indexed data is stale');
    return { status: 'up' as const, details: { stalenessMs } };
  }
}
@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_PROBE) private readonly database: DependencyProbe,
    @Inject(INDEXER_PROBE) private readonly indexer: DependencyProbe,
  ) {}
  async readiness() {
    const entries = await Promise.allSettled([this.database.check(), this.indexer.check()]);
    const names = ['database', 'indexer'] as const;
    const checks = Object.fromEntries(
      entries.map((entry, index) => [
        names[index],
        entry.status === 'fulfilled'
          ? entry.value
          : {
              status: 'down',
              error: entry.reason instanceof Error ? entry.reason.message : String(entry.reason),
            },
      ]),
    );
    if (entries.some((entry) => entry.status === 'rejected'))
      throw new ServiceUnavailableException({ status: 'not_ready', checks });
    return { status: 'ready', checks };
  }
}
