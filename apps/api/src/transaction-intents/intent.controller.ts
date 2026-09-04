import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentPrincipal } from '../identity/auth.guard';
import type { AccessPrincipal } from '../identity/auth.types';
import { TransactionIntentService } from './intent.service';
import type { IntentInput, IntentStatus } from './intent.types';
@ApiTags('transaction-intents')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('/api/v1/transaction-intents')
export class TransactionIntentController {
  constructor(private readonly service: TransactionIntentService) {}
  @Post() create(@CurrentPrincipal() p: AccessPrincipal, @Body() body: IntentInput) {
    return this.service.create(p, body);
  }
  @Get(':id') get(@CurrentPrincipal() p: AccessPrincipal, @Param('id') id: string) {
    return this.service.get(p, id);
  }
  @Patch(':id/status') status(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
    @Body() body: { status: IntentStatus; txHash?: string },
  ) {
    return this.service.update(p, id, body.status, body.txHash);
  }
  @Post(':id/consume') consume(@CurrentPrincipal() p: AccessPrincipal, @Param('id') id: string) {
    return this.service.consume(p, id);
  }
}
