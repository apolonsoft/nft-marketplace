import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import type { GraphQLFormattedError } from 'graphql';
import { ApiConfigModule } from './config/config.module';
import { loadApiConfig } from './config/config.service';
import { GlobalErrorFilter } from './common/errors';
import { HealthModule } from './health/health.module';
import { ObservabilityModule } from './observability/observability.module';
import { SystemModule } from './system/system.module';
import { IdentityModule } from './identity/identity.module';
import { DeveloperModule } from './developer/developer.module';
import { PrivacyModule } from './privacy/privacy.module';
import { MarketplaceReadModule } from './marketplace-read/read.module';
import { API_CONFIG } from './common/tokens';
import { TransactionIntentModule } from './transaction-intents/intent.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ApiConfigModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [API_CONFIG],
      useFactory: (config: ReturnType<typeof loadApiConfig>) => ({
        autoSchemaFile: true,
        sortSchema: true,
        playground: config.docsEnabled,
        context: ({ req }: { req: { requestId?: string } }) => ({ req }),
        formatError: (error: GraphQLFormattedError) => error,
      }),
    }),
    HealthModule,
    ObservabilityModule,
    IdentityModule,
    DeveloperModule,
    PrivacyModule,
    MarketplaceReadModule,
    TransactionIntentModule,
    SystemModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalErrorFilter }],
})
export class AppModule {}
