import type { Address, Hex } from 'viem';

export type IntentOperation =
  | 'DEPLOY_COLLECTION'
  | 'FREEZE_COLLECTION'
  | 'MINT'
  | 'MINT_BATCH'
  | 'APPROVE'
  | 'SET_APPROVAL_FOR_ALL'
  | 'CREATE_LISTING'
  | 'PURCHASE'
  | 'CANCEL_LISTING'
  | 'WITHDRAW';
export type IntentStatus =
  'CREATED' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'CONSUMED';
export interface IntentInput {
  operation: IntentOperation;
  chainId: number;
  idempotencyKey: string;
  expiresInSeconds?: number;
  to?: Address;
  value?: string | number | bigint;
  gas?: string | number | bigint;
  [key: string]: unknown;
}
export interface IntentResponse {
  id: string;
  operation: IntentOperation;
  chainId: number;
  to: Address;
  data: Hex;
  value: string;
  gas?: string;
  expiresAt: string;
  status: IntentStatus;
  txHash?: string;
  replayed?: boolean;
}
export interface ChainStateReader {
  validate(input: IntentInput, walletAddress: Address): Promise<void>;
}
