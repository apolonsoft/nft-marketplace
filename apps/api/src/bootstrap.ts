import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { loadApiConfig } from './config/config.service';
import { ApiLogger } from './common/logger';
import { requestContextMiddleware } from './common/request-context';

export const createOpenApiDocument = (app: INestApplication) =>
  SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('NFT Marketplace API')
      .setDescription('NFT marketplace REST API')
      .setVersion('1.0')
      .build(),
  );

export async function createApplication() {
  const config = loadApiConfig();
  const app = await NestFactory.create(AppModule, { logger: new ApiLogger(config.logLevel) });
  app.use(requestContextMiddleware);
  app.use('/graphql', (request: any, _response: any, next: any) => {
    const query = typeof request.body?.query === 'string' ? request.body.query : '';
    const depth = Math.max(0, (query.match(/[({]/g) ?? []).length);
    const points =
      query.length +
      (query.match(/\b(items|nodes|edges|listings|sales|activity)\b/g) ?? []).length * 25;
    if (depth > 20 || points > 5000) {
      _response.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'GraphQL query complexity exceeds the configured budget',
        retryable: false,
      });
      return;
    }
    next();
  });
  app.enableShutdownHooks();
  if (config.docsEnabled)
    SwaggerModule.setup('docs', app, createOpenApiDocument(app), {
      jsonDocumentUrl: 'docs/openapi.json',
    });
  return app;
}
