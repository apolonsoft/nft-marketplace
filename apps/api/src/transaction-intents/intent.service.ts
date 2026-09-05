import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { encodeFunctionData, isAddress, parseEther, type Address } from 'viem';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { API_CONFIG } from '../common/tokens';
import type { ApiConfig } from '../config/config.service';
import {
  CreatorCollectionFactoryAbi,
  CreatorERC721Abi,
  CreatorERC1155Abi,
  MarketplaceSettlementAbi,
  addressOf,
} from '@nft-marketplace/contracts';
import type { AccessPrincipal } from '../identity/auth.types';
import type { IntentInput, IntentResponse, IntentOperation } from './intent.types';
import { PrismaIntentRepository } from './prisma-intent.repository';

@Injectable()
export class TransactionIntentService {
  constructor(
    private readonly repo: PrismaIntentRepository,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}
  private hash(input: IntentInput) {
    return createHash('sha256')
      .update(JSON.stringify(input, (_, v) => (typeof v === 'bigint' ? v.toString() : v)))
      .digest('hex');
  }
  private target(chainId: number, name: string, provided?: Address): Address {
    if (provided) return provided;
    try {
      return addressOf(chainId as any, name) as Address;
    } catch {
      throw new AppError(ErrorCode.VALIDATION, `Missing ${name} contract address`);
    }
  }
  private calldata(
    input: IntentInput,
    wallet: Address,
  ): { to: Address; data: `0x${string}`; value: string } {
    const p = input as any;
    const to = this.target(input.chainId, p.contractAddress ?? p.to, p.to);
    let data: `0x${string}`;
    let value = String(p.value ?? '0');
    const abi: any =
      input.operation === 'DEPLOY_COLLECTION'
        ? CreatorCollectionFactoryAbi
        : ['MINT', 'MINT_BATCH', 'APPROVE', 'SET_APPROVAL_FOR_ALL', 'FREEZE_COLLECTION'].includes(input.operation)
          ? p.standard === 1155
            ? CreatorERC1155Abi
            : CreatorERC721Abi
          : MarketplaceSettlementAbi;
    const args: any =
      input.operation === 'DEPLOY_COLLECTION'
        ? [
            p.standard ?? 0,
            p.implementation,
            p.metadata,
            p.royaltyRecipient ?? wallet,
            p.royaltyBps ?? 0,
            p.salt ?? `0x${'00'.repeat(32)}`,
          ]
        : input.operation === 'FREEZE_COLLECTION'
          ? []
          : input.operation === 'MINT'
          ? p.standard === 1155
            ? [p.to ?? wallet, BigInt(p.tokenId), BigInt(p.quantity ?? 1), p.tokenURI ?? '']
            : [p.to ?? wallet, BigInt(p.tokenId), p.tokenURI ?? '']
          : input.operation === 'MINT_BATCH'
            ? p.standard === 1155
              ? [
                  p.to ?? wallet,
                  p.tokenIds.map((x: string) => BigInt(x)),
                  p.quantities.map((x: string) => BigInt(x)),
                  p.tokenURIs,
                ]
              : [p.to ?? wallet, p.tokenIds.map((x: string) => BigInt(x)), p.tokenURIs]
            : input.operation === 'APPROVE'
              ? [
                  p.operator ?? this.target(input.chainId, 'MarketplaceSettlement', p.operator),
                  BigInt(p.tokenId),
                ]
              : input.operation === 'SET_APPROVAL_FOR_ALL'
                ? [
                    p.operator ?? this.target(input.chainId, 'MarketplaceSettlement', p.operator),
                    Boolean(p.approved ?? true),
                  ]
                : input.operation === 'CREATE_LISTING'
                  ? [
                      p.collection,
                      BigInt(p.tokenId),
                      p.standard ?? 0,
                      BigInt(p.quantity),
                      BigInt(p.unitPrice),
                      p.currency,
                      BigInt(p.expiresAt),
                    ]
                  : input.operation === 'PURCHASE'
                    ? [
                        BigInt(p.listingId),
                        p.purchaseId ?? `0x${'00'.repeat(32)}`,
                        BigInt(p.quantity ?? 1),
                      ]
                    : input.operation === 'CANCEL_LISTING'
                      ? [BigInt(p.listingId)]
                      : [p.currency];
    const fn = (
      {
        DEPLOY_COLLECTION: 'deployCollection',
        FREEZE_COLLECTION: 'freezeCollection',
        MINT: 'mint',
        MINT_BATCH: 'mintBatch',
        APPROVE: 'approve',
        SET_APPROVAL_FOR_ALL: 'setApprovalForAll',
        CREATE_LISTING: 'createListing',
        PURCHASE: 'purchase',
        CANCEL_LISTING: 'cancelListing',
        WITHDRAW: 'withdraw',
      } as Record<IntentOperation, string>
    )[input.operation];
    try {
      data = encodeFunctionData({ abi, functionName: fn, args });
    } catch (e) {
      throw new AppError(ErrorCode.VALIDATION, 'Invalid transaction intent payload', { cause: e });
    }
    if (
      input.operation === 'PURCHASE' &&
      p.currency &&
      p.currency.toLowerCase() !== '0x0000000000000000000000000000000000000000'
    )
      value = '0';
    if (
      input.operation === 'PURCHASE' &&
      p.currency?.toLowerCase() === '0x0000000000000000000000000000000000000000'
    )
      value = String(p.totalValue ?? p.value ?? '0');
    return { to, data, value };
  }
  async create(principal: AccessPrincipal, input: IntentInput): Promise<IntentResponse> {
    if (!input.idempotencyKey || input.idempotencyKey.length > 128)
      throw new AppError(ErrorCode.VALIDATION, 'A valid idempotency key is required');
    if (
      !Number.isInteger(input.chainId) ||
      !this.config.auth.allowedChainIds.includes(input.chainId)
    )
      throw new AppError(ErrorCode.SIWE_INVALID_CHAIN, 'Unsupported chain');
    if (
      input.expiresInSeconds !== undefined &&
      (input.expiresInSeconds < 30 || input.expiresInSeconds > 3600)
    )
      throw new AppError(ErrorCode.VALIDATION, 'Intent expiry must be between 30 and 3600 seconds');
    const p = input as any;
    if (
      ((input.operation === 'MINT' && p.standard === 1155) ||
        input.operation === 'CREATE_LISTING' ||
        input.operation === 'PURCHASE') &&
      (!p.quantity || BigInt(p.quantity) <= 0n)
    )
      throw new AppError(ErrorCode.VALIDATION, 'Quantity must be positive');
    if (
      input.operation === 'MINT_BATCH' &&
      (!Array.isArray(p.tokenIds) ||
        !Array.isArray(p.tokenURIs) ||
        p.tokenIds.length === 0 ||
        p.tokenIds.length !== p.tokenURIs.length ||
        (p.standard === 1155 && p.tokenIds.length !== (p.quantities ?? []).length))
    )
      throw new AppError(ErrorCode.VALIDATION, 'Batch mint arrays must be non-empty and aligned');
    if (
      input.operation === 'CREATE_LISTING' &&
      (!p.expiresAt || BigInt(p.expiresAt) <= BigInt(Math.floor(Date.now() / 1000)))
    )
      throw new AppError(
        ErrorCode.LISTING_EXPIRED ?? ErrorCode.VALIDATION,
        'Listing expiry must be in the future',
      );
    if (input.operation === 'PURCHASE' && !p.listingId)
      throw new AppError(ErrorCode.VALIDATION, 'Listing ID is required');
    if (['CREATE_LISTING', 'PURCHASE', 'WITHDRAW'].includes(input.operation) && !p.currency)
      throw new AppError(
        ErrorCode.UNSUPPORTED_CURRENCY ?? ErrorCode.VALIDATION,
        'Currency is required',
      );
    const built = this.calldata(input, principal.address as Address);
    const expiresAt = new Date(
      Date.now() +
        (input.expiresInSeconds ?? Number(process.env.TRANSACTION_INTENT_TTL_SECONDS ?? 600)) *
          1000,
    );
    const response: IntentResponse = {
      id: 'pending',
      operation: input.operation,
      chainId: input.chainId,
      to: built.to,
      data: built.data,
      value: built.value,
      ...(input.gas ? { gas: String(input.gas) } : {}),
      expiresAt: expiresAt.toISOString(),
      status: 'CREATED',
    };
    return this.repo.create(principal.walletId, input, this.hash(input), response);
  }
  async get(p: AccessPrincipal, id: string) {
    const x = await this.repo.find(p.walletId, id);
    if (!x) throw new AppError(ErrorCode.NOT_FOUND, 'Transaction intent not found');
    if (new Date(x.expiresAt) <= new Date() && x.status === 'CREATED')
      await this.repo.updateStatus(p.walletId, id, 'EXPIRED');
    return x;
  }
  update(p: AccessPrincipal, id: string, status: any, txHash?: string) {
    return this.repo.updateStatus(p.walletId, id, status, txHash);
  }
  consume(p: AccessPrincipal, id: string) {
    return this.repo.consume(p.walletId, id);
  }
}
