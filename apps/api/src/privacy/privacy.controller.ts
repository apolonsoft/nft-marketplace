import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentPrincipal } from '../identity/auth.guard';
import type { AccessPrincipal } from '../identity/auth.types';
import { ApiKeyGuard, RequireScopes } from '../developer/api-key.guard';
import type { DeveloperPrincipal } from '../developer/developer.types';
import { PrivacyService } from './privacy.service';
import type { ProfileField, ProfileVisibility } from './privacy.types';

@ApiTags('profile-privacy')
@Controller('/api/v1')
export class PrivacyController {
  constructor(private readonly service: PrivacyService) {}
  @Get('profile/:address') public(@Param('address') address: string) {
    return this.service.publicProfile(address);
  }
  @Get('profile/me') @UseGuards(AuthGuard) @ApiBearerAuth() own(
    @CurrentPrincipal() p: AccessPrincipal,
  ) {
    return this.service.ownProfile(p.walletId);
  }
  @Patch('profile/me') @UseGuards(AuthGuard) @ApiBearerAuth() update(
    @CurrentPrincipal() p: AccessPrincipal,
    @Body() body: Partial<Record<ProfileField, string | null>>,
  ) {
    return this.service.update(p.walletId, body);
  }
  @Get('privacy/settings') @UseGuards(AuthGuard) settings(@CurrentPrincipal() p: AccessPrincipal) {
    return this.service.settings(p.walletId);
  }
  @Patch('privacy/settings') @UseGuards(AuthGuard) setSettings(
    @CurrentPrincipal() p: AccessPrincipal,
    @Body() body: Array<{ field: ProfileField; visibility: ProfileVisibility }>,
  ) {
    return this.service.setSettings(p.walletId, body);
  }
  @Get('privacy/consents') @UseGuards(AuthGuard) consents(@CurrentPrincipal() p: AccessPrincipal) {
    return this.service.consents(p.walletId);
  }
  @Post('privacy/consents') @UseGuards(AuthGuard) grant(
    @CurrentPrincipal() p: AccessPrincipal,
    @Body()
    body: { walletId?: string; applicationId: string; fields: ProfileField[]; purpose: string },
  ) {
    return this.service.grant(
      body.walletId ?? p.walletId,
      body.applicationId,
      body.fields,
      body.purpose,
      p.walletId,
    );
  }
  @Delete('privacy/consents/:id') @UseGuards(AuthGuard) revoke(
    @CurrentPrincipal() p: AccessPrincipal,
    @Param('id') id: string,
  ) {
    return this.service.revoke(p.walletId, id, p.walletId);
  }
  @Post('privacy/erase') @UseGuards(AuthGuard) erase(@CurrentPrincipal() p: AccessPrincipal) {
    return this.service.erase(p.walletId, p.walletId);
  }
  @Get('profile/:address/private') @UseGuards(ApiKeyGuard) @RequireScopes('profile:read') private(
    @Param('address') address: string,
    @Req() req: { developer: DeveloperPrincipal },
    @Body() body?: { fields?: ProfileField[]; purpose?: string },
  ) {
    return this.service.applicationProfile(
      address,
      req.developer.applicationId,
      body?.fields ?? ['displayName', 'email', 'avatar', 'bio'],
      body?.purpose ?? 'APPLICATION',
    );
  }
}
