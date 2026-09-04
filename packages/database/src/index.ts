export type ReadModelConfirmation = 'PENDING' | 'CONFIRMED';
export interface ChainProvenance {
  chainId: number;
  blockNumber: bigint;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  confirmation: ReadModelConfirmation;
}
export interface OwnerBalanceRow extends ChainProvenance {
  id: string;
  collectionId: string;
  tokenId: bigint;
  owner: string;
  quantity: bigint;
}
export interface TransactionConfirmationRow extends ChainProvenance {
  id: string;
  eventType: string;
  deduplicationKey: string;
}
export const eventId = (chainId: number, transactionHash: string, logIndex: number) =>
  `${chainId}:${transactionHash.toLowerCase()}:${logIndex}`;
export const balanceId = (collectionId: string, tokenId: bigint, owner: string) =>
  `${collectionId.toLowerCase()}:${tokenId.toString()}:${owner.toLowerCase()}`;
