import { Injectable } from '@nestjs/common';
import { PrismaService } from '../identity/prisma.service';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import type { IntentInput, IntentResponse, IntentStatus } from './intent.types';
import type { IntentRepository } from './intent.repository';

@Injectable()
export class PrismaIntentRepository implements IntentRepository {
  constructor(private readonly prisma: PrismaService) {}
  private map(x: any): IntentResponse {
    return {
      id: x.id,
      operation: x.operation,
      chainId: x.chainId,
      to: x.to as `0x${string}`,
      data: x.data as `0x${string}`,
      value: x.value,
      ...(x.gas ? { gas: x.gas } : {}),
      expiresAt: x.expiresAt.toISOString(),
      status: x.status,
      ...(x.txHash ? { txHash: x.txHash } : {}),
    };
  }
  async find(walletId: string, id: string) {
    const x = await this.prisma.transactionIntent.findFirst({ where: { id, walletId } });
    return x ? this.map(x) : null;
  }
  async create(
    walletId: string,
    input: IntentInput,
    requestHash: string,
    response: IntentResponse,
  ) {
    const existing = await this.prisma.transactionIntent.findUnique({
      where: { walletId_idempotencyKey: { walletId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw new AppError(
          ErrorCode.CONFLICT,
          'Idempotency key was already used with a different payload',
        );
      return { ...this.map(existing), replayed: true };
    }
    try {
      const x = await this.prisma.transactionIntent.create({
        data: {
          walletId,
          idempotencyKey: input.idempotencyKey,
          operation: input.operation as any,
          chainId: input.chainId,
          requestHash,
          to: response.to,
          data: response.data,
          value: response.value,
          gas: response.gas ?? null,
          expiresAt: new Date(response.expiresAt),
        },
      });
      return this.map(x);
    } catch (e) {
      throw new AppError(ErrorCode.CONFLICT, 'Unable to create transaction intent', { cause: e });
    }
  }
  async updateStatus(walletId: string, id: string, status: IntentStatus, txHash?: string) {
    const current = await this.prisma.transactionIntent.findFirst({ where: { id, walletId } });
    if (!current) throw new AppError(ErrorCode.NOT_FOUND, 'Transaction intent not found');
    if (new Date() >= current.expiresAt && !['EXPIRED', 'CONSUMED'].includes(current.status))
      throw new AppError(ErrorCode.VALIDATION, 'Transaction intent has expired');
    const allowed: Record<string, string[]> = {
      CREATED: ['SUBMITTED', 'FAILED', 'EXPIRED'],
      SUBMITTED: ['CONFIRMED', 'FAILED', 'EXPIRED'],
      CONFIRMED: ['CONSUMED'],
      FAILED: [],
      EXPIRED: [],
      CONSUMED: [],
    };
    const transitions = allowed[current.status] ?? [];
    if (!transitions.includes(status))
      throw new AppError(ErrorCode.VALIDATION, 'Invalid intent status transition');
    if ((status === 'SUBMITTED' || status === 'CONFIRMED') && !txHash)
      throw new AppError(ErrorCode.VALIDATION, 'Transaction hash is required');
    const data: any = { status };
    if (txHash) data.txHash = txHash;
    if (status === 'SUBMITTED') data.submittedAt = new Date();
    if (status === 'CONFIRMED') data.confirmedAt = new Date();
    if (status === 'FAILED') data.failedAt = new Date();
    if (status === 'CONSUMED') data.consumedAt = new Date();
    const x = await this.prisma.transactionIntent.update({ where: { id }, data });
    return this.map(x);
  }
  async consume(walletId: string, id: string) {
    return this.updateStatus(walletId, id, 'CONSUMED');
  }
}
