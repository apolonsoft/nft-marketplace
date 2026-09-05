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

export const workerSchemaSql = `
CREATE TABLE IF NOT EXISTS worker_processed_events (deduplication_key text PRIMARY KEY, event_id text NOT NULL, event_type text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS worker_entity_watermarks (entity_key text PRIMARY KEY, chain_id integer NOT NULL, block_number bigint NOT NULL, log_index integer NOT NULL, event_id text NOT NULL);
CREATE TABLE IF NOT EXISTS worker_search_projection (entity_key text PRIMARY KEY, entity_type text NOT NULL, data jsonb NOT NULL, chain_id integer NOT NULL, block_number bigint NOT NULL, log_index integer NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS worker_reconciliation_intents (intent_key text PRIMARY KEY, entity_key text, event_id text NOT NULL, reason text NOT NULL, status text NOT NULL DEFAULT 'PENDING', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS worker_notification_intents (intent_key text PRIMARY KEY, recipient_key text, event_id text NOT NULL, event_type text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'PREPARED', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS worker_webhook_fanout_intents (intent_key text PRIMARY KEY, event_id text NOT NULL, event_type text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'PENDING', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS worker_confirmation_intents (event_id text PRIMARY KEY, chain_id integer NOT NULL, block_number bigint NOT NULL, log_index integer NOT NULL, status text NOT NULL DEFAULT 'PENDING', updated_at timestamptz NOT NULL DEFAULT now());
`;
