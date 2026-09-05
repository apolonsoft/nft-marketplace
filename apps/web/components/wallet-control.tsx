'use client';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { WalletState } from '@nft-marketplace/ui';

export function WalletControl() {
  const account = useAccount();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switcher = useSwitchChain();
  const activeChain = Number(process.env.NEXT_PUBLIC_ACTIVE_CHAIN_ID ?? 84532);
  const wrong = account.isConnected && account.chainId !== activeChain;
  const state = connect.isPending
    ? WalletState.CONNECTING
    : wrong
      ? WalletState.WRONG_NETWORK
      : account.isConnected
        ? WalletState.CONNECTED
        : connect.error
          ? WalletState.REJECTED
          : WalletState.DISCONNECTED;
  const action = () => {
    if (wrong) switcher.switchChain({ chainId: activeChain as 31337 | 84532 });
    else if (account.isConnected) disconnect.disconnect();
    else {
      const connector = connect.connectors[0];
      if (connector) connect.connect({ connector });
    }
  };
  const label =
    state === WalletState.CONNECTED
      ? `${account.address?.slice(0, 6)}...${account.address?.slice(-4)}`
      : state === WalletState.WRONG_NETWORK
        ? 'Switch network'
        : state === WalletState.CONNECTING
          ? 'Connecting...'
          : 'Connect wallet';
  return (
    <button
      className="wallet-button"
      onClick={action}
      disabled={connect.isPending}
      aria-label={label}
    >
      {label}
    </button>
  );
}
