import { WalletStatus, WalletState } from '@nft-marketplace/ui';
import { AccountHistory } from '../../components/account-history';
export default function AccountPage() {
  return (
    <section className="content-section">
      <p className="eyebrow">YOUR COLLECTION</p>
      <h1>Account</h1>
      <WalletStatus state={WalletState.DISCONNECTED} />
      <AccountHistory />
    </section>
  );
}
