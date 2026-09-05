import 'reflect-metadata';
import { createServer } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { loadWorkerConfig } from './config.js';
import { WorkerModule } from './app.module.js';
import { WorkerMetrics } from './metrics.js';

const config = loadWorkerConfig();
const app = await NestFactory.createApplicationContext(WorkerModule);
const metrics = app.get(WorkerMetrics);
const server = createServer(async (_request, response) => {
  response.setHeader('content-type', metrics.registry.contentType);
  response.end(await metrics.registry.metrics());
});
server.listen(config.metricsPort);

const shutdown = async () => {
  server.close();
  await app.close();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
