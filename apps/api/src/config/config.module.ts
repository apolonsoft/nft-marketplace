import { Global, Module } from '@nestjs/common';
import { API_CONFIG } from '../common/tokens';
import { ConfigService, loadApiConfig } from './config.service';
@Global()
@Module({ providers: [ConfigService, { provide: API_CONFIG, useFactory: loadApiConfig }], exports: [ConfigService, API_CONFIG] })
export class ApiConfigModule {}
