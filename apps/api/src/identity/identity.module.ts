import { Module } from '@nestjs/common';
import { AUTH_CLOCK, AUTH_REPOSITORY } from '../common/tokens';
import { AuthController } from './auth.controller';
import { AuthResolver } from './auth.resolver';
import { AuthGuard } from './auth.guard';
import { PrismaAuthRepository } from './prisma-auth.repository';
import { PrismaService } from './prisma.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import type { AuthRepository } from './auth.types';

const testRepository: AuthRepository = {
  createNonce: async () => undefined,
  consumeNonceAndCreateSession: async () => null,
  rotateRefreshToken: async () => ({ status: 'invalid' }),
  getActiveSession: async () => null,
  revokeFamily: async () => undefined,
  getWallet: async () => null,
};

@Module({
  controllers: [AuthController],
  providers: [
    AuthResolver,
    ...(process.env.NODE_ENV === 'test' ? [] : [PrismaService, PrismaAuthRepository]),
    AuthService,
    AuthGuard,
    TokenService,
    {
      provide: AUTH_REPOSITORY,
      useFactory: (...args: [PrismaAuthRepository?]) => process.env.NODE_ENV === 'test' ? testRepository : args[0]!,
      inject: process.env.NODE_ENV === 'test' ? [] : [PrismaAuthRepository],
    },
    { provide: AUTH_CLOCK, useValue: () => new Date() },
  ],
  exports: [AuthService, AuthGuard],
})
export class IdentityModule {}
