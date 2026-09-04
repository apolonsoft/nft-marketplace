import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentPrincipal } from '../identity/auth.guard';
import type { AccessPrincipal } from '../identity/auth.types';
import { DeveloperService } from './developer.service';
import type { DeveloperRole, KeyEnvironment } from './developer.types';

@ApiTags('developer')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('/api/v1/developer')
export class DeveloperController {
  constructor(private readonly service: DeveloperService) {}
  @Post('applications') create(
    @CurrentPrincipal() p: AccessPrincipal,
    @Body() body: { name: string; slug: string; description?: string; dailyQuota?: number },
  ) {
    return this.service.createApplication(p.walletId, body);
  }
  @Get('applications') list(@CurrentPrincipal() p: AccessPrincipal) {
    return this.service.listApplications(p.walletId);
  }
  @Patch('applications/:id') async update(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; dailyQuota?: number },
  ) {
    await this.service.getAccess(id, p.walletId, ['OWNER', 'ADMIN']);
    return this.service.updateApplication(id, body);
  }
  @Delete('applications/:id') async archive(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
  ) {
    await this.service.getAccess(id, p.walletId, ['OWNER']);
    return this.service.archiveApplication(id);
  }
  @Get('applications/:id/keys') async keys(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
  ) {
    await this.service.getAccess(id, p.walletId);
    return this.service.listKeys(id);
  }
  @Post('applications/:id/keys') async createKey(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
    @Body() body: { environment: KeyEnvironment; name: string; scopes: string[] },
  ) {
    await this.service.getAccess(id, p.walletId, ['OWNER', 'ADMIN']);
    return this.service.issueKey(id, body);
  }
  @Post('applications/:id/keys/:keyId/rotate') async rotate(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
    @Param('keyId') keyId: string,
    @Body() body: { environment: KeyEnvironment; name: string; scopes: string[] },
  ) {
    await this.service.getAccess(id, p.walletId, ['OWNER', 'ADMIN']);
    return this.service.rotateKey(id, keyId, body);
  }
  @Delete('applications/:id/keys/:keyId') async revoke(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
    @Param('keyId') keyId: string,
  ) {
    await this.service.getAccess(id, p.walletId, ['OWNER', 'ADMIN']);
    return this.service.revokeKey(id, keyId);
  }
  @Get('applications/:id/usage') async usage(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
  ) {
    await this.service.getAccess(id, p.walletId);
    const to = new Date();
    const from = new Date(to.getTime() - 90 * 86400000);
    return this.service.usage(id, from, to);
  }
  @Post('applications/:id/invitations') async invite(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
    @Body() body: { walletAddress: string; role?: DeveloperRole },
  ) {
    await this.service.getAccess(id, p.walletId, ['OWNER', 'ADMIN']);
    return this.service.invite(id, body.walletAddress, body.role);
  }
  @Post('invitations/:token/accept') async accept(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('token') token: string,
  ) {
    return this.service.acceptInvitation(token, p.walletId, p.address);
  }
}
