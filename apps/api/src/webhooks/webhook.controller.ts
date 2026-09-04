import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentPrincipal } from '../identity/auth.guard';
import type { AccessPrincipal } from '../identity/auth.types';
import { WebhookService } from './webhook.service';
import type { WebhookSubscriptionInput } from './webhook.types';
@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('/api/v1/developer/applications/:applicationId/webhooks')
export class WebhookController {
  constructor(private readonly service: WebhookService) {}
  @Post() create(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('applicationId') app: string,
    @Body() body: WebhookSubscriptionInput,
  ) {
    return this.service.create(p, app, body);
  }
  @Get() list(@CurrentPrincipal() p: AccessPrincipal, @Param('applicationId') app: string) {
    return this.service.list(p, app);
  }
  @Post(':id/rotate') rotate(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('applicationId') app: string,
    @Param('id') id: string,
  ) {
    return this.service.rotate(p, app, id);
  }
  @Delete(':id') disable(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('applicationId') app: string,
    @Param('id') id: string,
  ) {
    return this.service.disable(p, app, id);
  }
  @Get(':id/deliveries') deliveries(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('applicationId') app: string,
    @Param('id') id: string,
  ) {
    return this.service.deliveries(p, app, id);
  }
  @Post('deliveries/:deliveryId/replay') replay(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('applicationId') app: string,
    @Param('deliveryId') id: string,
  ) {
    return this.service.replay(p, app, id);
  }
}
