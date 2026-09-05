'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { anvil, baseSepolia } from 'wagmi/chains';

const queryClient = new QueryClient();
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const connectors = [
  injected(),
  ...(projectId
    ? [
        walletConnect({
          projectId,
          metadata: {
            name: 'NFT Marketplace',
            description: 'NFT Marketplace',
            url: typeof location === 'undefined' ? 'http://localhost:3000' : location.origin,
            icons: [],
          },
        }),
      ]
    : []),
];
const config = createConfig({
  chains: [anvil, baseSepolia],
  connectors,
  transports: { [anvil.id]: http(), [baseSepolia.id]: http() },
  ssr: true,
});
const AuthContext = createContext<{ accessToken?: string }>({});
export const useAuthSession = () => useContext(AuthContext);
export function WalletProvider({ children }: { children: ReactNode }) {
  const auth = useMemo(() => ({}), []);
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
