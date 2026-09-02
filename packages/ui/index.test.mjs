import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Button, WalletStatus, WalletState, TransactionStatus, TransactionState } from './index.mjs';

test('renders accessible wallet action state', () => { const html = renderToStaticMarkup(React.createElement(WalletStatus, { state: WalletState.DISCONNECTED })); assert.match(html, /Connect wallet/); assert.match(html, /role="status"/); });
test('renders transaction failure details', () => { const html = renderToStaticMarkup(React.createElement(TransactionStatus, { state: TransactionState.FAILED, error: 'Rejected' })); assert.match(html, /Transaction failed/); assert.match(html, /Rejected/); });
test('renders button variant', () => assert.match(renderToStaticMarkup(React.createElement(Button, { variant: 'secondary' }, 'More')), /data-variant="secondary"/));
