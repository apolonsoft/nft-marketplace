import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { loadApiConfig } from './config/config.service';
import { ApiLogger } from './common/logger';
import { requestContextMiddleware } from './common/request-context';

export const createOpenApiDocument = (app: INestApplication) => SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('NFT Marketplace API').setDescription('NFT marketplace REST API').setVersion('1.0').build());

export async function createApplication() {
  const config = loadApiConfig();
  const app = await NestFactory.create(AppModule, { logger: new ApiLogger(config.logLevel) });
  app.use(requestContextMiddleware);
  app.enableShutdownHooks();
  if (config.docsEnabled) SwaggerModule.setup('docs', app, createOpenApiDocument(app), { jsonDocumentUrl: 'docs/openapi.json' });
  return app;
}
