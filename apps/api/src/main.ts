import 'reflect-metadata';
import { loadApiConfig } from './config/config.service';
import { createApplication } from './bootstrap';

const config = loadApiConfig();
const app = await createApplication();
await app.listen(config.port);
