import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TransactionIntentController } from './intent.controller';
import { TransactionIntentResolver } from './intent.resolver';
import { TransactionIntentService } from './intent.service';
import { PrismaIntentRepository } from './prisma-intent.repository';
@Module({
  imports: [IdentityModule],
  controllers: [TransactionIntentController],
  providers: [TransactionIntentResolver, TransactionIntentService, PrismaIntentRepository],
})
export class TransactionIntentModule {}
