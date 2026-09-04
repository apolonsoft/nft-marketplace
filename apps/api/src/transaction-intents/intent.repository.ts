import type { IntentInput, IntentResponse, IntentStatus } from './intent.types';
export interface IntentRepository {
  find(walletId: string, id: string): Promise<IntentResponse | null>;
  create(
    walletId: string,
    input: IntentInput,
    requestHash: string,
    response: IntentResponse,
  ): Promise<IntentResponse>;
  updateStatus(
    walletId: string,
    id: string,
    status: IntentStatus,
    txHash?: string,
  ): Promise<IntentResponse>;
  consume(walletId: string, id: string): Promise<IntentResponse>;
}
