import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentPrincipal } from '../identity/auth.guard';
import type { AccessPrincipal } from '../identity/auth.types';
import { AdminGuard } from './admin.guard';
import { ModerationService } from './moderation.service';
import type { ReportInput } from './moderation.types';
@ApiTags('moderation')
@Controller('/api/v1')
export class ModerationController {
  constructor(private readonly service: ModerationService) {}
  @Post('reports') @UseGuards(AuthGuard) @ApiBearerAuth() report(
    @CurrentPrincipal() p: AccessPrincipal,
    @Body() body: ReportInput,
  ) {
    return this.service.report(p, body);
  }
  @Get('reports/me') @UseGuards(AuthGuard) @ApiBearerAuth() mine(
    @CurrentPrincipal() p: AccessPrincipal,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.reports(p, query);
  }
  @Get('admin/reports') @UseGuards(AdminGuard) @ApiBearerAuth() all(
    @CurrentPrincipal() p: AccessPrincipal,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.reports(p, query, true);
  }
  @Get('admin/moderation/:targetType/:targetId') @UseGuards(AdminGuard) @ApiBearerAuth() detail(
    @Param('targetType') type: any,
    @Param('targetId') id: string,
  ) {
    return this.service.detail(type, id);
  }
  @Patch('admin/moderation/:targetType/:targetId') @UseGuards(AdminGuard) @ApiBearerAuth() moderate(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('targetType') type: any,
    @Param('targetId') id: string,
    @Body() body: { status: any; reason: string },
  ) {
    return this.service.moderate(p, type, id, body.status, body.reason);
  }
  @Get('admin/audit') @UseGuards(AdminGuard) @ApiBearerAuth() audit(
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.audit(query);
  }
  @Get('admin/allowlist') @UseGuards(AdminGuard) @ApiBearerAuth() admins() {
    return this.service.admins();
  }
  @Post('admin/allowlist') @UseGuards(AdminGuard) @ApiBearerAuth() add(
    @CurrentPrincipal() p: AccessPrincipal,
    @Body() body: { address: string },
  ) {
    return this.service.addAdmin(p, body.address);
  }
  @Delete('admin/allowlist/:walletId') @UseGuards(AdminGuard) @ApiBearerAuth() revoke(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('walletId') id: string,
    @Body() body: { reason: string },
  ) {
    return this.service.revokeAdmin(p, id, body.reason);
  }
}
