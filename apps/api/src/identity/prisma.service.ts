import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import prismaClient from '@prisma/client';

const { PrismaClient } = prismaClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
