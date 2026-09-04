import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, WalletStatus, WalletState, TransactionStatus, TransactionState } from './index.js';
describe('shared UI', () => {
  it('renders wallet status accessibly', () => {
    const html = renderToStaticMarkup(<WalletStatus state={WalletState.DISCONNECTED} />);
    expect(html).toContain('Connect wallet');
    expect(html).toContain('role="status"');
  });
  it('renders transaction errors', () =>
    expect(
      renderToStaticMarkup(<TransactionStatus state={TransactionState.FAILED} error="Rejected" />),
    ).toContain('Rejected'));
  it('renders variants', () =>
    expect(renderToStaticMarkup(<Button variant="secondary">More</Button>)).toContain(
      'data-variant="secondary"',
    ));
});
