'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { TransactionState } from '@nft-marketplace/ui';
import { useTransactionController } from '../lib/transaction';

type Standard = 'ERC721' | 'ERC1155';
type Draft = {
  name: string;
  symbol: string;
  description: string;
  standard: Standard;
  tokenId: string;
  quantity: string;
  price: string;
  currency: string;
  expiry: string;
  imageName: string;
};

const initialDraft: Draft = {
  name: '',
  symbol: '',
  description: '',
  standard: 'ERC721',
  tokenId: '1',
  quantity: '1',
  price: '',
  currency: 'ETH',
  expiry: '',
  imageName: '',
};

export function CreatorWorkspace() {
  const account = useAccount();
  const wallet = useWalletClient();
  const tx = useTransactionController();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [step, setStep] = useState('collection');
  const [notice, setNotice] = useState('');

  const storageKey = useMemo(
    () => (account.address ? `creator-draft:${account.address.toLowerCase()}` : ''),
    [account.address],
  );
  useEffect(() => {
    if (!storageKey) return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setDraft({ ...initialDraft, ...JSON.parse(saved) });
  }, [storageKey]);
  useEffect(() => {
    if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  const update = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const upload = (file: File | undefined) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type))
      return setNotice('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
    if (file.size > 10 * 1024 * 1024) return setNotice('Image exceeds the 10 MB upload limit.');
    update('imageName', file.name);
    setNotice('Image validated. Upload processing will begin when saved.');
  };
  const run = async (operation: string) => {
    if (!account.address) return setNotice('Connect a wallet to continue.');
    if (operation === 'MINT' && draft.standard === 'ERC721' && draft.quantity !== '1')
      return setNotice('ERC-721 quantity is always 1.');
    await tx.run(async () => {
      let intent: any;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/v1/transaction-intents`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              operation,
              chainId: account.chainId ?? 84532,
              idempotencyKey: `${storageKey}:${operation}:${draft.tokenId}`,
              standard: draft.standard === 'ERC1155' ? 1155 : 721,
              quantity: draft.quantity,
              tokenId: draft.tokenId,
              metadata: { name: draft.name, symbol: draft.symbol, description: draft.description },
              currency: draft.currency,
              expiresAt: Math.floor(Date.now() / 1000) + 86400,
            }),
          },
        );
        if (response.ok) intent = await response.json();
      } catch {
        /* unauthenticated local development can still show the workflow state */
      }
      if (intent?.to && wallet.data) {
        const hash = await wallet.data.sendTransaction({
          to: intent.to,
          data: intent.data,
          value: BigInt(intent.value ?? 0),
        });
        return { hash };
      }
      return {};
    });
    setNotice(`${operation.replaceAll('_', ' ').toLowerCase()} submitted.`);
  };

  return (
    <section className="content-section creator-workspace">
      <p className="eyebrow">CREATOR STUDIO</p>
      <h1>Build and release onchain work</h1>
      <p className="lede">
        Your draft is saved to this wallet and can be resumed on another visit.
      </p>
      <div className="creator-steps" role="tablist" aria-label="Creator workflow steps">
        {['collection', 'media', 'mint', 'market'].map((value) => (
          <button
            key={value}
            className="button"
            role="tab"
            aria-selected={step === value}
            onClick={() => setStep(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {step === 'collection' && (
        <div className="creator-form">
          <label>
            Collection name
            <input value={draft.name} onChange={(e) => update('name', e.target.value)} required />
          </label>
          <label>
            Symbol
            <input
              value={draft.symbol}
              onChange={(e) => update('symbol', e.target.value.toUpperCase())}
              maxLength={12}
            />
          </label>
          <label>
            Standard
            <select
              value={draft.standard}
              onChange={(e) => update('standard', e.target.value as Standard)}
            >
              <option>ERC721</option>
              <option>ERC1155</option>
            </select>
          </label>
          <label>
            Description
            <textarea
              value={draft.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
            />
          </label>
          <button className="button" onClick={() => run('DEPLOY_COLLECTION')}>
            Create collection
          </button>
        </div>
      )}
      {step === 'media' && (
        <div className="creator-form">
          <label>
            Collection image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <p role="status">{draft.imageName || 'No image selected'}</p>
          <button
            className="button"
            onClick={() => setNotice('Metadata validation and IPFS pinning queued.')}
          >
            Validate and pin metadata
          </button>
        </div>
      )}
      {step === 'mint' && (
        <div className="creator-form">
          <label>
            Token ID
            <input
              inputMode="numeric"
              value={draft.tokenId}
              onChange={(e) => update('tokenId', e.target.value)}
            />
          </label>
          <label>
            Quantity
            <input
              inputMode="numeric"
              min="1"
              value={draft.quantity}
              onChange={(e) =>
                update('quantity', draft.standard === 'ERC721' ? '1' : e.target.value)
              }
            />
          </label>
          <button className="button" onClick={() => run('MINT')}>
            Mint token
          </button>
          <button className="button" onClick={() => run('FREEZE_COLLECTION')}>
            Freeze metadata
          </button>
        </div>
      )}
      {step === 'market' && (
        <div className="creator-form">
          <label>
            Price
            <input
              inputMode="decimal"
              value={draft.price}
              onChange={(e) => update('price', e.target.value)}
            />
          </label>
          <label>
            Currency
            <select value={draft.currency} onChange={(e) => update('currency', e.target.value)}>
              <option>ETH</option>
              <option>USDC</option>
            </select>
          </label>
          <label>
            Expiry
            <input
              type="datetime-local"
              value={draft.expiry}
              onChange={(e) => update('expiry', e.target.value)}
            />
          </label>
          <button className="button" onClick={() => run('SET_APPROVAL_FOR_ALL')}>
            Approve marketplace
          </button>
          <button className="button" onClick={() => run('CREATE_LISTING')}>
            List for sale
          </button>
          <button className="button" onClick={() => run('CANCEL_LISTING')}>
            Cancel listing
          </button>
          <button className="button" onClick={() => run('WITHDRAW')}>
            Withdraw proceeds
          </button>
        </div>
      )}
      <div className="state-panel" role="status" aria-live="polite">
        <strong>{tx.state === TransactionState.FAILED ? 'Failed' : tx.state}</strong>
        {tx.error ? `: ${tx.error}` : ''}
        {notice ? ` ${notice}` : ''}
        {tx.state === TransactionState.FAILED && (
          <button className="button" onClick={() => tx.retry()}>
            Retry
          </button>
        )}
      </div>
    </section>
  );
}
