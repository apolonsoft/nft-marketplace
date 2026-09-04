import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './bootstrap';
import { requestContextMiddleware } from './common/request-context';
import { DATABASE_PROBE, INDEXER_PROBE } from './common/tokens';

describe('API bootstrap', () => {
  let app: INestApplication;
  let databaseUp = true;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DATABASE_PROBE).useValue({ check: async () => { if (!databaseUp) throw new Error('database offline'); return { status: 'up' }; } }).overrideProvider(INDEXER_PROBE).useValue({ check: async () => ({ status: 'up', details: { stalenessMs: 0 } }) }).compile();
    app = module.createNestApplication();
    app.use(requestContextMiddleware);
    SwaggerModule.setup('docs', app, createOpenApiDocument(app), { jsonDocumentUrl: 'docs/openapi.json' });
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => app.close());
  it('serves versioned REST with request correlation', async () => { const response = await request(app.getHttpServer()).get('/api/v1/system').set('x-request-id', 'test-request'); expect(response.status).toBe(200); expect(response.headers['x-request-id']).toBe('test-request'); });
  it('serves liveness and readiness separately', async () => { expect((await request(app.getHttpServer()).get('/health/live')).status).toBe(200); expect((await request(app.getHttpServer()).get('/health/ready')).body.status).toBe('ready'); databaseUp = false; expect((await request(app.getHttpServer()).get('/health/ready')).status).toBe(503); expect((await request(app.getHttpServer()).get('/health/live')).status).toBe(200); databaseUp = true; });
  it('exposes metrics and OpenAPI documentation', async () => { expect((await request(app.getHttpServer()).get('/metrics')).text).toContain('api_http_requests_total'); expect((await request(app.getHttpServer()).get('/docs/openapi.json')).body.paths).toHaveProperty('/api/v1/system'); });
  it('generates and serves GraphQL', async () => { const response = await request(app.getHttpServer()).post('/graphql').send({ query: '{ apiVersion }' }); expect(response.body).toEqual({ data: { apiVersion: 'v1' } }); });
  it('normalizes missing routes', async () => { const response = await request(app.getHttpServer()).get('/missing'); expect(response.status).toBe(404); expect(response.body.code).toBe('NOT_FOUND'); expect(response.body.requestId).toBeTruthy(); });
});
