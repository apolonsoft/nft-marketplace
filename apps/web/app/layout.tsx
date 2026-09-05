import '@nft-marketplace/ui/styles.css';
import './styles.css';
import { WalletProvider } from '../components/wallet-provider';
import { Navigation } from '../components/navigation';

export const metadata = {
  title: 'NFT Marketplace',
  description: 'Discover and collect onchain work.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Navigation />
          <main className="web-shell">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
