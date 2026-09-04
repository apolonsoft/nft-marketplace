import 'reflect-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import { printSchema } from 'graphql';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { createApplication, createOpenApiDocument } from '../src/bootstrap';

process.env.NODE_ENV = 'test';
const app = await createApplication();
await app.init();
const output = new URL('../generated/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(
  new URL('openapi.json', output),
  `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`,
);
await writeFile(
  new URL('schema.graphql', output),
  `${printSchema(app.get(GraphQLSchemaHost).schema)}\n`,
);
await app.close();
