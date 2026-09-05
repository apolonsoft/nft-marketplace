import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export class WorkerMetrics {
  readonly registry = new Registry();
  readonly jobs = new Counter({
    name: 'worker_jobs_total',
    help: 'Worker jobs by outcome',
    labelNames: ['queue', 'job', 'outcome'],
    registers: [this.registry],
  });
  readonly duration = new Histogram({
    name: 'worker_job_duration_seconds',
    help: 'Worker job processing duration',
    labelNames: ['queue', 'job'],
    registers: [this.registry],
  });
  readonly ready = new Gauge({
    name: 'worker_ready',
    help: 'Worker readiness',
    registers: [this.registry],
  });
  readonly events = new Counter({
    name: 'worker_events_total',
    help: 'Domain event processing outcomes',
    labelNames: ['outcome'],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'worker_' });
  }
}
