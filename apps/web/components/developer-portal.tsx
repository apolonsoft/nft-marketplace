'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { createSiweMessage } from 'viem/siwe';
import { useAuthSession } from './wallet-provider';

const baseUrl = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const scopes = ['marketplace:read', 'marketplace:write', 'webhooks:manage'];
const events = [
  'COLLECTION_DEPLOYED',
  'MINTED',
  'TRANSFERRED',
  'LISTING_CREATED',
  'LISTING_CANCELLED',
  'PURCHASED',
  'WITHDRAWN',
  'MODERATION_CHANGED',
];
type App = { id: string; name: string; slug: string; description?: string; dailyQuota?: number };
type Key = {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  scopes: string[];
  revokedAt?: string | null;
};
type Hook = {
  id: string;
  endpointUrl: string;
  eventTypes: string[];
  status: string;
  secretVersion: number;
};

export function DeveloperPortal() {
  const account = useAccount();
  const sign = useSignMessage();
  const auth = useAuthSession();
  const [token, setToken] = useState(auth.accessToken ?? '');
  const [apps, setApps] = useState<App[]>([]);
  const [selected, setSelected] = useState('');
  const [tab, setTab] = useState('overview');
  const [keys, setKeys] = useState<Key[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [usage, setUsage] = useState<Record<string, unknown>[]>([]);
  const [secret, setSecret] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PURCHASED']);
  const [deliveries, setDeliveries] = useState<Record<string, unknown>[]>([]);
  const headers = useMemo(
    () => ({
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers ?? {}) },
      credentials: 'include',
    });
    const body = await response.json().catch(() => undefined);
    if (!response.ok) throw new Error(body?.message ?? `Request failed (${response.status})`);
    return body;
  };
  const authenticate = async () => {
    if (!account.address || !account.chainId)
      return setError('Connect a wallet before opening the developer portal.');
    try {
      const domain = window.location.host;
      const uri = window.location.origin;
      const nonce = await request('/api/v1/auth/nonce', {
        method: 'POST',
        body: JSON.stringify({ address: account.address, domain, chainId: account.chainId }),
      });
      const message = createSiweMessage({
        address: account.address,
        chainId: account.chainId,
        domain,
        nonce: nonce.nonce,
        statement: nonce.statement,
        uri,
        version: '1',
        issuedAt: nonce.issuedAt,
      });
      const signature = await sign.signMessageAsync({ message });
      const result = await request('/api/v1/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ message, signature }),
      });
      setToken(result.accessToken);
      setNotice('Wallet authenticated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet authentication failed');
    }
  };
  const load = async () => {
    if (!token) return;
    try {
      const result = await request('/api/v1/developer/applications');
      setApps(result);
      if (!selected && result[0]) setSelected(result[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load applications');
    }
  };
  useEffect(() => {
    void load();
  }, [token]);
  useEffect(() => {
    if (!token || !selected) return;
    Promise.all([
      request(`/api/v1/developer/applications/${selected}/keys`),
      request(`/api/v1/developer/applications/${selected}/usage`),
      request(`/api/v1/developer/applications/${selected}/webhooks`),
    ])
      .then(([k, u, h]) => {
        setKeys(k);
        setUsage(u);
        setHooks(h);
        return [k, u, h];
      })
      .catch((e) => setError(e.message));
  }, [selected, token]);
  const createApp = async () => {
    try {
      const result = await request('/api/v1/developer/applications', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
        }),
      });
      setApps((current) => [result, ...current]);
      setSelected(result.id);
      setName('');
      setNotice('Application created.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create application');
    }
  };
  const createKey = async () => {
    try {
      const result = await request(`/api/v1/developer/applications/${selected}/keys`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Portal key', environment: 'TEST', scopes }),
      });
      setKeys((current) => [result, ...current]);
      setSecret(result.key);
      setNotice('Copy this secret now. It will not be shown again.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create key');
    }
  };
  const mutateKey = async (key: Key, action: 'revoke' | 'rotate') => {
    try {
      const result = await request(
        `/api/v1/developer/applications/${selected}/keys/${key.id}${action === 'rotate' ? '/rotate' : ''}`,
        {
          method: action === 'revoke' ? 'DELETE' : 'POST',
          ...(action === 'rotate'
            ? {
                body: JSON.stringify({
                  name: key.name,
                  environment: key.environment,
                  scopes: key.scopes,
                }),
              }
            : {}),
        },
      );
      if (result?.key) setSecret(result.key);
      setKeys((current) =>
        current.map((item) =>
          item.id === key.id ? { ...item, revokedAt: new Date().toISOString() } : item,
        ),
      );
      setNotice(
        action === 'rotate' ? 'Replacement secret is shown once.' : 'Key revoked immediately.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update key');
    }
  };
  const createHook = async () => {
    try {
      const result = await request(`/api/v1/developer/applications/${selected}/webhooks`, {
        method: 'POST',
        body: JSON.stringify({ endpointUrl: endpoint, eventTypes: selectedEvents }),
      });
      setHooks((current) => [result.result, ...current]);
      setSecret(result.secret);
      setEndpoint('');
      setNotice('Webhook secret is shown once.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create webhook');
    }
  };
  const hookAction = async (hook: Hook, action: 'rotate' | 'disable') => {
    try {
      const result = await request(
        `/api/v1/developer/applications/${selected}/webhooks/${hook.id}${action === 'rotate' ? '/rotate' : ''}`,
        { method: action === 'rotate' ? 'POST' : 'DELETE' },
      );
      if (result?.secret) setSecret(result.secret);
      setHooks((current) =>
        current.map((item) =>
          item.id === hook.id
            ? {
                ...item,
                status: action === 'disable' ? 'DISABLED' : 'ACTIVE',
                secretVersion: result?.result?.secretVersion ?? item.secretVersion,
              }
            : item,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update webhook');
    }
  };
  const showDeliveries = async (hook: Hook) => {
    try {
      setDeliveries(
        await request(`/api/v1/developer/applications/${selected}/webhooks/${hook.id}/deliveries`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load deliveries');
    }
  };
  const replay = async (deliveryId: string) => {
    try {
      await request(
        `/api/v1/developer/applications/${selected}/webhooks/deliveries/${deliveryId}/replay`,
        { method: 'POST' },
      );
      setNotice('Delivery replay queued.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to replay delivery');
    }
  };
  if (!token)
    return (
      <section className="content-section developer-portal">
        <p className="eyebrow">BUILD</p>
        <h1>Developer portal</h1>
        <p className="lede">
          Manage applications, keys, usage, and webhooks from a wallet-authenticated workspace.
        </p>
        <button className="button" onClick={authenticate} disabled={sign.isPending}>
          {sign.isPending ? 'Signing...' : 'Authenticate wallet'}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    );
  const app = apps.find((item) => item.id === selected);
  return (
    <section className="content-section developer-portal">
      <p className="eyebrow">BUILD</p>
      <h1>Developer portal</h1>
      <div className="developer-toolbar">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select application</option>
          {apps.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          placeholder="New application name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="button" onClick={createApp} disabled={!name}>
          Create application
        </button>
      </div>
      {app && (
        <>
          <nav className="developer-tabs" aria-label="Developer workspace">
            {['overview', 'keys', 'webhooks', 'usage', 'team', 'docs'].map((value) => (
              <button
                key={value}
                className="button"
                aria-current={tab === value ? 'page' : undefined}
                onClick={() => setTab(value)}
              >
                {value}
              </button>
            ))}
          </nav>
          {tab === 'overview' && (
            <div className="developer-grid">
              <div>
                <h2>{app.name}</h2>
                <p>{app.description || 'Application workspace'}</p>
                <p>Quota: {app.dailyQuota ?? 'default'} requests/day</p>
              </div>
              <div>
                <h2>Quick links</h2>
                <p>Use the Keys and Webhooks tabs to create credentials and subscriptions.</p>
              </div>
            </div>
          )}
          {tab === 'keys' && (
            <div className="developer-panel">
              <h2>API keys</h2>
              <button className="button" onClick={createKey}>
                Create test key
              </button>
              <ul>
                {keys.map((key) => (
                  <li key={key.id}>
                    <strong>{key.prefix}...</strong>
                    <span>
                      {key.environment} · {key.scopes.join(', ')}
                    </span>
                    <button
                      className="button"
                      onClick={() => mutateKey(key, 'rotate')}
                      disabled={!!key.revokedAt}
                    >
                      Rotate
                    </button>
                    <button
                      className="button"
                      onClick={() => mutateKey(key, 'revoke')}
                      disabled={!!key.revokedAt}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === 'webhooks' && (
            <div className="developer-panel">
              <h2>Webhook subscriptions</h2>
              <input
                placeholder="https://example.com/webhook"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
              <select
                multiple
                value={selectedEvents}
                onChange={(e) =>
                  setSelectedEvents(Array.from(e.target.selectedOptions, (option) => option.value))
                }
              >
                {events.map((event) => (
                  <option key={event}>{event}</option>
                ))}
              </select>
              <button className="button" onClick={createHook} disabled={!endpoint}>
                Add subscription
              </button>
              <ul>
                {hooks.map((hook) => (
                  <li key={hook.id}>
                    <strong>{hook.endpointUrl}</strong>
                    <span>
                      {hook.status} · v{hook.secretVersion}
                    </span>
                    <button className="button" onClick={() => showDeliveries(hook)}>
                      Delivery history
                    </button>
                    <button className="button" onClick={() => hookAction(hook, 'rotate')}>
                      Rotate secret
                    </button>
                    <button
                      className="button"
                      onClick={() => hookAction(hook, 'disable')}
                      disabled={hook.status === 'DISABLED'}
                    >
                      Disable
                    </button>
                  </li>
                ))}
              </ul>
              {deliveries.length > 0 && (
                <ul>
                  {deliveries.map((delivery, index) => (
                    <li key={String(delivery.id ?? index)}>
                      <span>
                        {String(delivery.status ?? 'PENDING')} · {String(delivery.createdAt ?? '')}
                      </span>
                      <button className="button" onClick={() => replay(String(delivery.id))}>
                        Replay
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {tab === 'usage' && (
            <div className="developer-panel">
              <h2>Usage</h2>
              <p>
                {usage.reduce((sum, row) => sum + Number(row.requestCount ?? 0), 0)} requests in the
                last 90 days
              </p>
              <ul>
                {usage.slice(0, 20).map((row, index) => (
                  <li key={index}>
                    <span>
                      {String(row.day ?? '')} · {String(row.endpointGroup ?? '')}
                    </span>
                    <strong>{String(row.requestCount ?? 0)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === 'team' && (
            <div className="developer-panel">
              <h2>Team access</h2>
              <p>Owner and admin roles can manage credentials and webhooks.</p>
            </div>
          )}
          {tab === 'docs' && (
            <div className="developer-panel">
              <h2>Documentation</h2>
              <p>
                <a href={`${baseUrl()}/docs`} target="_blank" rel="noreferrer">
                  OpenAPI documentation
                </a>
              </p>
              <p>
                <a href={`${baseUrl()}/graphql`} target="_blank" rel="noreferrer">
                  GraphQL endpoint
                </a>
              </p>
            </div>
          )}
        </>
      )}
      {secret && (
        <div className="secret-panel" role="alert">
          <strong>One-time secret</strong>
          <code>{secret}</code>
          <button className="button" onClick={() => navigator.clipboard?.writeText(secret)}>
            Copy
          </button>
          <button
            className="button"
            onClick={() => {
              const blob = new Blob([secret], { type: 'text/plain' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = 'marketplace-secret.txt';
              link.click();
              URL.revokeObjectURL(link.href);
            }}
          >
            Download
          </button>
          <button className="button" onClick={() => setSecret('')}>
            Dismiss
          </button>
        </div>
      )}
      {(error || notice) && (
        <div className="state-panel" role={error ? 'alert' : 'status'}>
          {error || notice}
          <button
            className="button"
            onClick={() => {
              setError('');
              setNotice('');
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </section>
  );
}
