'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';
import { TransactionState } from '@nft-marketplace/ui';
import { useTransactionController } from '../lib/transaction';

type Listing = {
  id: string;
  seller?: string;
  quantity?: string;
  state?: string;
  stale?: boolean;
  unavailableReason?: string | null;
  price?: { value?: string; currencyCode?: string };
  currency?: string;
  nftId?: string;
};
const zero = '0x0000000000000000000000000000000000000000';
const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export function CollectorCheckout() {
  const account = useAccount();
  const wallet = useWalletClient();
  const tx = useTransactionController();
  const [listing, setListing] = useState<Listing>();
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const listingId = useMemo(
    () =>
      new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get(
        'listingId',
      ),
    [],
  );
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

  useEffect(() => {
    if (!listingId) return;
    fetch(`${base}/api/v1/purchase-preflight/${listingId}?quantity=1`)
      .then((r) => r.json())
      .then((x) => {
        if (x.listing) setListing(x.listing);
        if (!x.available) setError(x.reason);
        return x;
      })
      .catch(() => setError('Unable to load listing'));
  }, [base, listingId]);
  const currency = listing?.price?.currencyCode ?? listing?.currency ?? 'ETH';
  const isUsdc = currency.toUpperCase() === 'USDC' || currency.startsWith('0x');
  const unavailable =
    !listing ||
    listing.stale ||
    listing.state !== 'ACTIVE' ||
    Number(quantity) < 1 ||
    Number(quantity) > Number(listing.quantity ?? 0);
  const run = async (operation: 'APPROVE_CURRENCY' | 'PURCHASE') => {
    if (!account.address || !wallet.data || !listing || unavailable)
      return setError('Connect a wallet and select an available listing.');
    setError('');
    try {
      await tx.run(async () => {
        const response = await fetch(`${base}/api/v1/transaction-intents`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            operation,
            chainId: account.chainId ?? 84532,
            idempotencyKey: `purchase:${listing.id}:${account.address}:${quantity}:${operation}`,
            listingId: listing.id,
            quantity,
            currency: isUsdc ? (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? zero) : zero,
            totalValue: String(BigInt(listing.price?.value ?? '0') * BigInt(quantity)),
            standard: Number(listing.quantity ?? 1) > 1 ? 1155 : 721,
          }),
        });
        if (!response.ok)
          throw new Error(
            (await response.json().catch(() => null))?.message ?? 'Unable to prepare transaction',
          );
        const intent = await response.json();
        return {
          hash: await wallet.data.sendTransaction({
            to: intent.to,
            data: intent.data,
            value: BigInt(intent.value ?? 0),
          }),
        };
      });
      if (operation === 'PURCHASE') setConfirmed(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Transaction failed. Check your balance and try again.',
      );
    }
  };
  return (
    <section className="content-section checkout-workspace">
      <p className="eyebrow">COLLECT</p>
      <h1>Checkout</h1>
      {error && (
        <div className="state-panel" role="alert">
          {error}
        </div>
      )}
      {listing ? (
        <div className="checkout-summary">
          <p>
            <strong>{listing.nftId ?? `Listing ${listing.id}`}</strong>
          </p>
          <p>
            {listing.price?.value ?? '0'} {currency}
          </p>
          <p>Available: {listing.quantity ?? '0'}</p>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              max={listing.quantity}
              value={quantity}
              disabled={listing.stale}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          {isUsdc && (
            <p className="lede">
              USDC approval is required before purchase. If your allowance or balance is
              insufficient, approve the displayed amount or fund your wallet.
            </p>
          )}
          {listing.stale || listing.state !== 'ACTIVE' ? (
            <p className="unavailable-label">
              Unavailable: {listing.unavailableReason ?? 'Listing is no longer active'}
            </p>
          ) : (
            <div className="checkout-actions">
              {isUsdc && (
                <button
                  className="button"
                  onClick={() => run('APPROVE_CURRENCY')}
                  disabled={tx.state === TransactionState.PENDING}
                >
                  Approve USDC
                </button>
              )}
              <button
                className="button"
                onClick={() => run('PURCHASE')}
                disabled={tx.state === TransactionState.PENDING}
              >
                {isUsdc ? 'Purchase after approval' : 'Purchase with ETH'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="state-panel">Select a listing to begin checkout.</div>
      )}
      <div className="state-panel" role="status" aria-live="polite">
        <strong>{confirmed ? 'Purchase confirmed' : tx.state}</strong>
        {tx.hash ? ` Transaction: ${tx.hash}` : ''}
        {tx.state === TransactionState.FAILED && (
          <button className="button" onClick={() => tx.retry()}>
            Retry
          </button>
        )}
      </div>
    </section>
  );
}
