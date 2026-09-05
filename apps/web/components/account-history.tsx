'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
export function AccountHistory() {
  const account = useAccount();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!account.address) return;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
    fetch(`${base}/api/v1/sales?buyer=${account.address}&first=20`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error('Unable to load transaction history')),
      )
      .then((x) => setRows(x.items ?? []))
      .catch((e) => setError(e.message));
  }, [account.address]);
  if (!account.address)
    return <div className="state-panel">Connect a wallet to view purchase history.</div>;
  return (
    <div className="history-panel">
      <h2>Transaction history</h2>
      {error && <p role="alert">{error}</p>}
      {rows.length === 0 && !error ? (
        <p className="lede">No indexed purchases yet.</p>
      ) : (
        <ul>
          {rows.map((row, index) => (
            <li key={String(row.id ?? index)}>
              <strong>{String(row.transactionHash ?? row.id ?? 'Purchase')}</strong>
              <span>
                {String(row.quantity ?? '1')} units ·{' '}
                {String(row.currency ?? row.currencyCode ?? '')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
