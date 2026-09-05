'use client';
import { useCallback, useState } from 'react';
import {
  TransactionState,
  type TransactionState as TransactionStateValue,
} from '@nft-marketplace/ui';
export function useTransactionController() {
  const [state, setState] = useState<TransactionStateValue>(TransactionState.INTENT);
  const [error, setError] = useState<string>();
  const [hash, setHash] = useState<string>();
  const [lastOperation, setLastOperation] = useState<() => Promise<{ hash?: string }>>();
  const run = useCallback(async (operation: () => Promise<{ hash?: string }>) => {
    setLastOperation(() => operation);
    setError(undefined);
    setState(TransactionState.PENDING);
    try {
      const result = await operation();
      setHash(result.hash);
      setState(result.hash ? TransactionState.SUBMITTED : TransactionState.CONFIRMED);
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Transaction failed');
      setState(TransactionState.FAILED);
      throw reason;
    }
  }, []);
  return {
    state,
    error,
    hash,
    run,
    retry: () => (lastOperation ? run(lastOperation) : Promise.resolve({})),
    confirm: () => setState(TransactionState.CONFIRMED),
    expire: () => setState(TransactionState.EXPIRED),
    reset: () => setState(TransactionState.INTENT),
  };
}
