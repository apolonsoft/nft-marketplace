import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AccessPrincipal } from './auth.types';
import { AuthService } from './auth.service';
import { AuthGuard, CurrentPrincipal } from './auth.guard';
import { API_CONFIG } from '../common/tokens';
import type { ApiConfig } from '../config/config.service';

class NonceDto {
  @ApiProperty({ example: '0x0000000000000000000000000000000000000000' }) address!: string;
  @ApiProperty({ example: 'localhost:3000' }) domain!: string;
  @ApiProperty({ example: 31337 }) chainId!: number;
}

class VerifyDto {
  @ApiProperty() message!: string;
  @ApiProperty() signature!: string;
}

const cookieValue = (request: Request, name: string) =>
  request.headers.cookie
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)
    ?.slice(1)
    .join('=');

@ApiTags('authentication')
@Controller('/api/v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  @Post('nonce')
  @HttpCode(200)
  @ApiBody({ type: NonceDto })
  issueNonce(@Body() body: NonceDto) {
    return this.auth.issueNonce(body);
  }

  @Post('verify')
  @HttpCode(200)
  @ApiBody({ type: VerifyDto })
  async verify(@Body() body: VerifyDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.verify(body);
    this.setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _refreshToken, ...publicResult } = result;
    return publicResult;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth()
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(
      cookieValue(request, this.config.auth.refreshCookieName) ?? '',
    );
    this.setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _refreshToken, ...publicResult } = result;
    return publicResult;
  }

  @Post('revoke')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async revoke(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.revoke(principal);
    response.clearCookie(this.config.auth.refreshCookieName, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Authenticated wallet profile' })
  me(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.auth.me(principal);
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie(this.config.auth.refreshCookieName, token, {
      ...this.cookieOptions(),
      maxAge: this.config.auth.refreshTokenTtlSeconds * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.auth.secureCookies,
      sameSite: 'strict' as const,
      path: '/api/v1/auth',
    };
  }
}
