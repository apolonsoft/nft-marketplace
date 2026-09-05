import { WalletStatus, WalletState } from '@nft-marketplace/ui';
export default function AccountPage() {
  return (
    <section className="content-section">
      <p className="eyebrow">YOUR COLLECTION</p>
      <h1>Account</h1>
      <WalletStatus state={WalletState.DISCONNECTED} />
      <div className="state-panel">Connect a wallet to view your activity.</div>
    </section>
  );
}
